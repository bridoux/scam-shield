import { parseClientReport, MAX_CLIENT_REPORT_BYTES } from "@/lib/errors/client-report";
import { reportError } from "@/lib/errors/report";
import { isBrowserNoise } from "@/lib/errors/scrub";
import { allow, clientIp } from "@/lib/rate-limit";

function status(code: number): Response {
  return new Response(null, { status: code, headers: { "Cache-Control": "no-store" } });
}

/** Only pages of this site may report: another site can't fill the log or spend the alert budget. */
function fromThisSite(request: Request): boolean {
  const site = request.headers.get("sec-fetch-site");
  if (site) return site === "same-origin";
  // Older browsers send no Sec-Fetch-Site; their Origin header, when present, must be ours.
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

/** The body as text, or null once it grows past the limit (Content-Length can be missing or wrong). */
async function readCapped(request: Request, maxBytes: number): Promise<string | null> {
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

/** Crash reports from players' browsers (docs/sprints/error-alerts.md). */
export async function POST(request: Request) {
  if (!fromThisSite(request)) return status(403);

  const body = await readCapped(request, MAX_CLIENT_REPORT_BYTES);
  if (body === null) return status(413);
  const report = parseClientReport(body);
  if (!report) return status(400);
  if (isBrowserNoise(report.message)) return status(204);

  if (!(await allow("clientError", (await clientIp()) ?? "unknown"))) return status(429);
  await reportError({ source: "browser", scope: `browser.${report.kind}`, error: report.message, route: report.path });
  return status(204);
}
