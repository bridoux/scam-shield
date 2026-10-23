/**
 * A same-site path to continue to after sign-in. Anything else (absolute URLs,
 * protocol-relative "//evil.example", backslashes) falls back to "/".
 */
export function safeNextPath(value: unknown): string {
  if (typeof value !== "string" || value.length > 200 || !value.startsWith("/")) return "/";
  // URL parsers drop tabs/newlines and treat "\" like "/", so "/\t/evil.example" would
  // become "//evil.example". Reject control characters, spaces and backslashes outright...
  if (/[\u0000- \u007f\\]/.test(value)) return "/";
  // ...then confirm by parsing that the path stays on our origin.
  const base = "http://same-origin.invalid";
  try {
    const url = new URL(value, base);
    if (url.origin !== base) return "/";
    return `${url.pathname}${url.search}`;
  } catch {
    return "/";
  }
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Trimmed, lower-cased email, or null if it doesn't look like one. */
export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && EMAIL.test(email) ? email : null;
}

/** Collapses whitespace and trims; null if empty or longer than `max`. */
export function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.replace(/\s+/g, " ").trim();
  return text.length > 0 && text.length <= max ? text : null;
}

/** "pat.lee@dealer.example" → "Pat Lee": a starting display name the person can edit. */
export function nameFromEmail(email: string): string {
  return email
    .split("@")[0]
    .split(/[._+-]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ")
    .slice(0, 80);
}
