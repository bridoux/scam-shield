import type { ClientReportKind } from "./client-report";
import { isBrowserNoise } from "./scrub";

/** A page that keeps failing reports a few times, not on every frame. */
const MAX_REPORTS_PER_PAGE = 3;
const sent = new Set<string>();

/**
 * Sends a crash report to our own server (never a third party). The path goes without its query
 * string; the server scrubs the rest. Fire and forget: reporting must never break the page further.
 */
export function reportBrowserError(kind: ClientReportKind, message: string): void {
  try {
    const text = message.slice(0, 1000);
    if (!text.trim() || isBrowserNoise(text) || sent.has(text) || sent.size >= MAX_REPORTS_PER_PAGE) return;
    sent.add(text);
    const body = JSON.stringify({ kind, message: text, path: window.location.pathname.slice(0, 500) });
    const blob = new Blob([body], { type: "application/json" });
    if (!navigator.sendBeacon?.("/api/client-error", blob)) {
      void fetch("/api/client-error", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
    }
  } catch {
    // Nothing more to do: the page has already failed.
  }
}

export function messageOf(reason: unknown): string {
  if (reason instanceof Error) return `${reason.name}: ${reason.message}`;
  return typeof reason === "string" ? reason : "Unknown error";
}
