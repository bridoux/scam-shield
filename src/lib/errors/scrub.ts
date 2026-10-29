/**
 * Error messages and paths are scrubbed before they are stored or emailed
 * (docs/sprints/error-alerts.md): no email address, invite token, id or query string leaves the app.
 */

export const MAX_MESSAGE = 300;
export const MAX_ROUTE = 200;

// Deliberately broad (any characters around an @, including accents and apostrophes): a false
// match only hides a little text, a miss leaks an address.
const EMAIL = /[^\s@<>()",;:]*@[^\s@<>()"',;]+/gu;
const ENCODED_AT = /%40/gi;
const ENCODED_PLUS = /%2b/gi;
// Postgres repeats the offending value in these messages, and it can be a name or other input.
const ECHOED_VALUE = /((?:invalid input syntax for type|invalid input value for enum) [\w. ]+: )"[^"]*"/gi;
const LINK = /\b(?:https?:\/\/|www\.)\S+/gi;
const URL_QUERY = /(https?:\/\/[^\s?#]+)[?#][^\s]*/g;
const JOIN_TOKEN = /\/join\/[^\s/?#]+/g;
const UUID = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
// Session and API tokens: their header part alone can be shorter than LONG_TOKEN.
const JWT = /\beyJ[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]*){1,2}/g;
// Long runs of letters, digits, _ and - are tokens, keys or JWT parts, never words.
const LONG_TOKEN = /[A-Za-z0-9_-]{24,}/g;

function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/** A one-line message with identifiers removed, at most 300 characters. */
export function scrubMessage(message: string): string {
  const scrubbed = message
    .replace(ENCODED_AT, "@")
    .replace(ENCODED_PLUS, "+")
    .replace(ECHOED_VALUE, '$1"[value]"')
    .replace(URL_QUERY, "$1")
    .replace(JOIN_TOKEN, "/join/[token]")
    .replace(EMAIL, "[email]")
    .replace(UUID, "[id]")
    .replace(JWT, "[token]")
    .replace(LONG_TOKEN, "[token]")
    .replace(/\s+/g, " ")
    .trim();
  return clip(scrubbed || "(no message)", MAX_MESSAGE);
}

/**
 * For text anyone can send (browser reports): links become "[link]", so an alert email can't
 * carry a clickable phishing link in a trusted sender's name.
 */
export function withoutLinks(message: string): string {
  return message.replace(LINK, "[link]");
}

/** A page path without query string, fragment, tokens or ids; null if it isn't a path. */
export function scrubPath(path: string | null | undefined): string | null {
  if (!path || !path.startsWith("/")) return null;
  const bare = path.split(/[?#]/)[0]!;
  return clip(scrubMessage(bare).replace(/ /g, ""), MAX_ROUTE);
}

/** Groups occurrences that differ only in numbers (counts, timings, line numbers). */
export function normalizeForFingerprint(message: string): string {
  return message.replace(/\d+/g, "#").toLowerCase();
}

/** Readable text for anything thrown: Error, a Supabase error object, a string or something else. */
export function describeError(error: unknown): string {
  if (error instanceof Error) {
    const code = "code" in error && error.code ? ` (${String(error.code)})` : "";
    return `${error.name}: ${error.message}${code}`;
  }
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const { code, status, message } = error as { code?: unknown; status?: unknown; message?: unknown };
    const parts = [status, code, message].filter((part) => part !== undefined && part !== null && part !== "");
    if (parts.length) return parts.map(String).join(" ");
  }
  return "Unknown error";
}

// Browser failures that aren't bugs: a dropped connection, a cancelled request, an old page
// asking for files a new deploy replaced, and a harmless layout warning.
const BROWSER_NOISE = [
  /failed to fetch/i,
  /load failed/i,
  /networkerror/i,
  /network error/i,
  /network request failed/i,
  /\baborted?\b/i,
  /aborterror/i,
  /chunkloaderror/i,
  /loading (css )?chunk/i,
  /resizeobserver loop/i,
  /^script error\.?$/i,
];

export function isBrowserNoise(message: string): boolean {
  return BROWSER_NOISE.some((pattern) => pattern.test(message));
}
