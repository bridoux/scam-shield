import "server-only";
import type { Member } from "../auth";
import { allow } from "../rate-limit";
import { createAdminClient } from "../supabase/admin";
import { createClient } from "../supabase/server";
import { refusal } from "./http";
import { loadRecordFor, recordManager, type Params, type RecordAccess } from "./load";
import { logError } from "../errors/report";

export type DownloadFormat = "pdf" | "csv";

function textResponse(status: number, message: string): Response {
  return new Response(message, { status, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}

/**
 * Everything a record download must pass before the file is built, cheapest first: no cross-site
 * trigger, the role check, the per-person download limit, the report itself, and a row in the
 * download log. A download that can't be logged is refused, so the log stays complete.
 */
export async function authorizeDownload(request: Request, format: DownloadFormat): Promise<Extract<RecordAccess, { ok: true }> | Response> {
  // A link on another site can't spend someone's download allowance or fill the log.
  if (request.headers.get("sec-fetch-site") === "cross-site") return textResponse(403, "Open the download from the dashboard.");

  const manager = await recordManager();
  if (!manager.ok) return refusal(manager.reason);
  if (!(await allow("recordDownload", manager.member.userId))) {
    return textResponse(429, "Too many downloads in the last hour. Please try again later.");
  }

  const params: Params = Object.fromEntries(new URL(request.url).searchParams);
  const access = await loadRecordFor(manager.member, params);
  if (!access.ok) return refusal(access.reason);
  const { member, record } = access;

  const { error } = await createAdminClient().from("record_exports").insert({
    organization_id: member.organizationId,
    user_id: member.userId,
    format,
    period_from: record.period.from,
    period_to: record.period.to,
  });
  if (error) {
    logError("downloads.log", error);
    return textResponse(503, "The download couldn't be recorded, so it was stopped. Please try again.");
  }
  return access;
}

export interface DownloadLogEntry {
  id: string;
  at: string;
  format: DownloadFormat;
  from: string;
  to: string;
  /** Null when the account has since been deleted. */
  byName: string | null;
}

/** The company's latest record downloads, read as the owner/admin (RLS scopes them to the company). */
export async function recentDownloads(member: Member, limit = 10): Promise<DownloadLogEntry[]> {
  const supabase = await createClient();
  const [{ data: rows, error }, { data: people }] = await Promise.all([
    supabase
      .from("record_exports")
      .select("id, created_at, format, period_from, period_to, user_id")
      .eq("organization_id", member.organizationId)
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase.from("memberships").select("user_id, display_name").eq("organization_id", member.organizationId),
  ]);
  if (error) throw new Error(`Loading the download log failed: ${error.message}`);
  const names = new Map((people ?? []).map((p) => [p.user_id, p.display_name]));
  return (rows ?? []).map((r) => ({
    id: r.id,
    at: r.created_at,
    format: r.format as DownloadFormat,
    from: r.period_from,
    to: r.period_to,
    byName: r.user_id ? (names.get(r.user_id) ?? null) : null,
  }));
}
