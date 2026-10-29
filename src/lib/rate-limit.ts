import "server-only";
import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { createAdminClient } from "./supabase/admin";
import { logError } from "./errors/report";

/** Fixed-window limits (docs/sprints/hardening.md). */
export const LIMITS = {
  // Generous: a whole office often signs in from one address. The per-email limit is the real control.
  signInIp: { limit: 60, windowSeconds: 15 * 60 },
  signInEmail: { limit: 5, windowSeconds: 60 * 60 },
  invite: { limit: 20, windowSeconds: 60 * 60 },
  recordDownload: { limit: 30, windowSeconds: 60 * 60 },
  startRound: { limit: 30, windowSeconds: 60 * 60 },
  clientError: { limit: 20, windowSeconds: 60 * 60 },
} as const;

export type LimitName = keyof typeof LIMITS;

/** Keyed so stored counters can't be reversed into IP addresses or emails by brute force. */
function hashSecret(): string {
  const secret = process.env.RATE_LIMIT_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("RATE_LIMIT_SECRET (or SUPABASE_SERVICE_ROLE_KEY) is not set");
  return secret;
}

/** The stored key: the limit's name and an HMAC-SHA256 of the subject. */
export function limitKey(name: LimitName, subject: string, secret: string = hashSecret()): string {
  return `${name}:${createHmac("sha256", secret).update(subject).digest("hex")}`;
}

/** "Dana+test@Dealer.example" → "dana@dealer.example", so plus-address variants share one limit. */
export function emailSubject(email: string): string {
  const [local, domain] = email.trim().toLowerCase().split("@");
  return domain ? `${local.split("+")[0]}@${domain}` : email.trim().toLowerCase();
}

/** The client's address as Vercel reports it, or null when no proxy header says. */
export function clientIpFrom(vercelForwardedFor: string | null, forwardedFor: string | null, realIp: string | null): string | null {
  for (const value of [vercelForwardedFor, forwardedFor]) {
    const first = value?.split(",")[0]?.trim();
    if (first) return first;
  }
  return realIp?.trim() || null;
}

export async function clientIp(): Promise<string | null> {
  const h = await headers();
  return clientIpFrom(h.get("x-vercel-forwarded-for"), h.get("x-forwarded-for"), h.get("x-real-ip"));
}

/**
 * Counts one request against a limit and says whether it may go ahead. If the counter itself
 * fails, the request is allowed (and logged): a database hiccup should never lock people out.
 */
export async function allow(name: LimitName, subject: string): Promise<boolean> {
  const { limit, windowSeconds } = LIMITS[name];
  try {
    const { data, error } = await createAdminClient().rpc("hit_rate_limit", {
      p_key: limitKey(name, subject),
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (error) throw error;
    return data;
  } catch (error: unknown) {
    logError(`rateLimit.${name}`, error);
    return true;
  }
}
