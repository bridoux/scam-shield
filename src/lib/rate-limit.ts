import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { createAdminClient } from "./supabase/admin";

/** Fixed-window limits (docs/sprints/hardening.md). */
export const LIMITS = {
  signInIp: { limit: 10, windowSeconds: 15 * 60 },
  signInEmail: { limit: 5, windowSeconds: 60 * 60 },
  invite: { limit: 20, windowSeconds: 60 * 60 },
  recordDownload: { limit: 30, windowSeconds: 60 * 60 },
  startRound: { limit: 30, windowSeconds: 60 * 60 },
} as const;

export type LimitName = keyof typeof LIMITS;

/** The stored key: the limit's name and a SHA-256 of the subject, so no raw IP or email is kept. */
export function limitKey(name: LimitName, subject: string): string {
  return `${name}:${createHash("sha256").update(subject).digest("hex")}`;
}

/** The client's address as Vercel reports it (the first X-Forwarded-For entry), or "unknown". */
export function clientIpFrom(forwardedFor: string | null, realIp: string | null): string {
  const first = forwardedFor?.split(",")[0]?.trim();
  return first || realIp?.trim() || "unknown";
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return clientIpFrom(h.get("x-forwarded-for"), h.get("x-real-ip"));
}

/**
 * Counts one request against a limit and says whether it may go ahead. If the counter itself
 * fails, the request is allowed (and logged): a database hiccup should never lock people out.
 */
export async function allow(name: LimitName, subject: string): Promise<boolean> {
  const { limit, windowSeconds } = LIMITS[name];
  const { data, error } = await createAdminClient().rpc("hit_rate_limit", {
    p_key: limitKey(name, subject),
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error(`[rate-limit] ${name} check failed`, error.code, error.message);
    return true;
  }
  return data;
}
