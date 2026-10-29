import "server-only";
import { createHash } from "node:crypto";
import { after } from "next/server";
import { createAdminClient } from "../supabase/admin";
import { alertConfig, composeAlert, sendAlert } from "./alert-email";
import { describeError, normalizeForFingerprint, scrubMessage, scrubPath, withoutLinks } from "./scrub";

export type ErrorSource = "server" | "browser" | "health";

export interface ErrorReport {
  source: ErrorSource;
  /** What failed, e.g. "account.deleteUser" or "render /dashboard". Part of the fingerprint. */
  scope: string;
  error: unknown;
  /** The page or route pattern, scrubbed before it is stored. */
  route?: string | null;
}

/**
 * Emails per day for each source (Resend's free plan allows 100 in all). Browser reports can be
 * sent by anyone, so they get a small budget of their own and can't use up the server's.
 */
export const DAILY_ALERT_BUDGET: Record<ErrorSource, number> = { server: 40, health: 10, browser: 5 };

const HOUR_MS = 60 * 60 * 1000;
/** Without the error log, each server instance sends at most this many emails an hour. */
const MAX_UNLOGGED_ALERTS_PER_HOUR = 10;
const MAX_UNLOGGED_FINGERPRINTS = 200;

export function environment(env: NodeJS.ProcessEnv = process.env): string {
  return (env.VERCEL_ENV ?? (env.NODE_ENV === "test" ? "test" : "development")).slice(0, 20);
}

export function fingerprintOf(environmentName: string, source: ErrorSource, scope: string, message: string): string {
  return createHash("sha256").update([environmentName, source, scope, normalizeForFingerprint(message)].join("\n")).digest("hex");
}

interface UnloggedAlerts {
  byFingerprint: Map<string, number>;
  sentAt: number[];
}

// Used only when the error log can't be reached (usually a database outage, when every request fails).
const unlogged: UnloggedAlerts = { byFingerprint: new Map(), sentAt: [] };

/** At most hourly per kind of error and 10 an hour in all, per server instance. */
export function shouldAlertWithoutLog(fingerprint: string, now: number, state: UnloggedAlerts = unlogged): boolean {
  state.sentAt = state.sentAt.filter((at) => now - at < HOUR_MS);
  const last = state.byFingerprint.get(fingerprint);
  if (last !== undefined && now - last < HOUR_MS) return false;
  if (state.sentAt.length >= MAX_UNLOGGED_ALERTS_PER_HOUR) return false;
  if (state.byFingerprint.size >= MAX_UNLOGGED_FINGERPRINTS) state.byFingerprint.clear();
  state.byFingerprint.set(fingerprint, now);
  state.sentAt.push(now);
  return true;
}

interface Logged {
  shouldAlert: boolean;
  isNew: boolean;
  sinceAlert: number | null;
  firstSeen: string | null;
  /** False when the error log was unreachable. */
  inLog: boolean;
}

async function logOccurrence(fingerprint: string, environmentName: string, report: ErrorReport, message: string, route: string | null): Promise<Logged> {
  try {
    const { data, error } = await createAdminClient()
      .rpc("record_error", {
        p_fingerprint: fingerprint,
        p_environment: environmentName,
        p_source: report.source,
        p_scope: report.scope,
        p_message: message,
        // The column allows null; generated types can't express nullable function arguments.
        p_route: route as string,
        p_daily_alerts: DAILY_ALERT_BUDGET[report.source],
      })
      .single();
    if (error) throw error;
    return { shouldAlert: data.should_alert, isNew: data.is_new, sinceAlert: data.since_alert, firstSeen: data.first_seen, inLog: true };
  } catch (unreachable: unknown) {
    console.error("[errors] the error log is unreachable", describeError(unreachable));
    return { shouldAlert: shouldAlertWithoutLog(fingerprint, Date.now()), isNew: false, sinceAlert: null, firstSeen: null, inLog: false };
  }
}

/**
 * Counts an error in the error log and emails the operator when it is new, or hourly while it
 * keeps happening. Never throws: reporting must not turn one failure into two.
 */
export async function reportError(report: ErrorReport): Promise<void> {
  try {
    const environmentName = environment();
    const scrubbed = scrubMessage(describeError(report.error));
    const message = report.source === "browser" ? withoutLinks(scrubbed) : scrubbed;
    const route = scrubPath(report.route);
    const fingerprint = fingerprintOf(environmentName, report.source, report.scope, message);

    const logged = await logOccurrence(fingerprint, environmentName, report, message, route);
    const config = alertConfig();
    if (!logged.shouldAlert || !config) return;

    const commit = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7);
    const deployment = [process.env.VERCEL_URL, commit].filter(Boolean).join(" · ") || null;
    const email = composeAlert({ environment: environmentName, source: report.source, scope: report.scope, message, route, ...logged, at: new Date(), deployment });
    try {
      await sendAlert(config, email);
    } catch (sendFailure: unknown) {
      console.error("[errors] ALERT EMAIL NOT SENT", report.scope, describeError(sendFailure));
      // Let the next occurrence try again instead of staying quiet for an hour.
      if (logged.inLog) await createAdminClient().rpc("release_error_alert", { p_fingerprint: fingerprint });
    }
  } catch (failure: unknown) {
    console.error("[errors] reporting an error failed", describeError(failure));
  }
}

/** Runs the report after the response is sent, or straight away outside a request (scripts, tests). */
export function reportLater(report: ErrorReport): void {
  try {
    after(() => reportError(report));
  } catch {
    void reportError(report);
  }
}

/**
 * For errors our code catches and handles: logs now (with the full error, for Vercel's logs)
 * and reports after the response is sent, so the visitor never waits on it.
 */
export function logError(scope: string, error: unknown, route?: string | null): void {
  console.error(`[${scope}] failed`, error);
  reportLater({ source: "server", scope, error, route });
}
