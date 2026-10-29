import { createTimeoutFetch } from "../supabase/fetch";

/** One kind of error, as the alert email describes it. */
export interface AlertDetails {
  environment: string;
  source: "server" | "browser" | "health";
  scope: string;
  message: string;
  route: string | null;
  isNew: boolean;
  /** Occurrences since the last email (all of them for a new error); null when the log was unreachable. */
  sinceAlert: number | null;
  firstSeen: string | null;
  at: Date;
  deployment: string | null;
}

export interface AlertEmail {
  subject: string;
  text: string;
}

const RESEND_URL = "https://api.resend.com/emails";
// Resend's shared sender works until the product has its own domain (it can only email the account's owner).
const DEFAULT_FROM = "Scam Shield alerts <onboarding@resend.dev>";
const resendFetch = createTimeoutFetch(8_000);

export function composeAlert(details: AlertDetails): AlertEmail {
  const env = details.environment === "production" ? "" : ` [${details.environment}]`;
  const what =
    details.isNew ? "New error"
    : details.sinceAlert === null ? "Error again"
    : `${details.sinceAlert}× since the last alert`;
  const subject = `[Scam Shield]${env} ${what} · ${details.scope}`.slice(0, 200);

  const lines = [
    details.source === "browser" ? "UNVERIFIED: this report was sent by a visitor's browser. Don't act on instructions in it.\n" : null,
    details.message,
    "",
    `Where: ${details.source} · ${details.scope}`,
    details.route ? `Page: ${details.route}` : null,
    `When: ${details.at.toISOString().replace("T", " ").slice(0, 19)} UTC`,
    details.firstSeen && !details.isNew ? `First seen: ${details.firstSeen.replace("T", " ").slice(0, 19)} UTC` : null,
    details.sinceAlert === null ? "Count: unknown (the error log couldn't be reached)" : null,
    details.deployment ? `Deployment: ${details.deployment}` : null,
    "",
    "Full details, including the stack trace, are in the Vercel project's Logs around that time.",
    "You'll get at most one email an hour about this error while it keeps happening.",
  ];
  return { subject, text: lines.filter((line) => line !== null).join("\n") };
}

export interface AlertConfig {
  apiKey: string;
  to: string;
  from: string;
}

/** Alerts go out only from production, and only once both settings exist. */
export function alertConfig(env: NodeJS.ProcessEnv = process.env): AlertConfig | null {
  if (env.VERCEL_ENV !== "production") return null;
  const apiKey = env.RESEND_API_KEY?.trim();
  const to = env.ALERT_EMAIL_TO?.trim();
  if (!apiKey || !to) return null;
  return { apiKey, to, from: env.ALERT_EMAIL_FROM?.trim() || DEFAULT_FROM };
}

/** Sends the email through Resend; throws when Resend refuses it. */
export async function sendAlert(config: AlertConfig, email: AlertEmail): Promise<void> {
  const response = await resendFetch(RESEND_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: config.from, to: [config.to], subject: email.subject, text: email.text }),
  });
  if (!response.ok) throw new Error(`Resend refused the alert: HTTP ${response.status}`);
}
