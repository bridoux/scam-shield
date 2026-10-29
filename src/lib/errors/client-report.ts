/** What a browser sends to /api/client-error, and the checks the server applies to it. */

export const CLIENT_REPORT_KINDS = ["render", "error", "rejection"] as const;
export type ClientReportKind = (typeof CLIENT_REPORT_KINDS)[number];

export interface ClientReport {
  kind: ClientReportKind;
  message: string;
  path: string;
}

/** Bodies larger than this are refused before parsing. */
export const MAX_CLIENT_REPORT_BYTES = 4096;
const MAX_RAW_MESSAGE = 1000;
const MAX_RAW_PATH = 500;

/** The report, or null when the body isn't one. */
export function parseClientReport(body: string): ClientReport | null {
  if (body.length > MAX_CLIENT_REPORT_BYTES) return null;
  let value: unknown;
  try {
    value = JSON.parse(body);
  } catch {
    return null;
  }
  if (!value || typeof value !== "object") return null;
  const { kind, message, path } = value as Record<string, unknown>;
  if (typeof kind !== "string" || !(CLIENT_REPORT_KINDS as readonly string[]).includes(kind)) return null;
  if (typeof message !== "string" || !message.trim() || message.length > MAX_RAW_MESSAGE) return null;
  if (typeof path !== "string" || !path.startsWith("/") || path.length > MAX_RAW_PATH) return null;
  return { kind: kind as ClientReportKind, message, path };
}
