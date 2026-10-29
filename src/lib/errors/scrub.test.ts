import { describe, expect, it } from "vitest";
import { describeError, isBrowserNoise, MAX_MESSAGE, normalizeForFingerprint, scrubMessage, scrubPath, withoutLinks } from "./scrub";

describe("scrubMessage", () => {
  it("removes email addresses, ids, invite tokens and long tokens", () => {
    const message =
      "dana.lee+test@dealer.example failed for 3f2b8c1e-9a4d-4e2f-8b1a-0c9d8e7f6a5b at /join/AbCdEfGh123456789012 with eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0";
    const scrubbed = scrubMessage(message);
    expect(scrubbed).toBe("[email] failed for [id] at /join/[token] with [token]");
    expect(scrubbed).not.toMatch(/dana|3f2b8c1e|AbCdEf|eyJ/);
  });

  it("removes addresses with accents, apostrophes, unusual domains or URL encoding", () => {
    for (const message of [
      "no user josé@dealer.example",
      "no user dana@bücher.example",
      "no user o'brien@dealer.example",
      "GET /sign-in?email=dana%40dealer.example failed",
      "no user DANA%40Dealer.Example",
    ]) {
      const scrubbed = scrubMessage(message);
      expect(scrubbed, message).toContain("[email]");
      expect(scrubbed, message).not.toMatch(/josé|bücher|brien|dana|dealer/i);
    }
  });

  it("removes the value Postgres repeats back from bad input", () => {
    expect(scrubMessage('invalid input syntax for type uuid: "Dana Smith"')).toBe('invalid input syntax for type uuid: "[value]"');
    expect(scrubMessage('invalid input value for enum public.member_role: "boss"')).toBe('invalid input value for enum public.member_role: "[value]"');
  });

  it("drops query strings and fragments from URLs", () => {
    expect(scrubMessage("GET https://scam-shield.example/dashboard?from=2026-10-01&to=x#top failed")).toBe(
      "GET https://scam-shield.example/dashboard failed",
    );
  });

  it("keeps ordinary words, codes and short numbers readable", () => {
    expect(scrubMessage("PostgrestError: permission denied for table rounds (42501)")).toBe(
      "PostgrestError: permission denied for table rounds (42501)",
    );
  });

  it("is one line, at most 300 characters, and never empty", () => {
    expect(scrubMessage("a\n\n  b\tc")).toBe("a b c");
    expect(scrubMessage("word ".repeat(200)).length).toBe(MAX_MESSAGE);
    expect(scrubMessage("   ")).toBe("(no message)");
  });
});

describe("withoutLinks", () => {
  it("replaces links so a browser report can't carry a phishing link into the inbox", () => {
    expect(withoutLinks("Security notice: rotate your key at https://evil.example/login or www.evil.example now")).toBe(
      "Security notice: rotate your key at [link] or [link] now",
    );
    expect(withoutLinks("TypeError: card.verdict is undefined")).toBe("TypeError: card.verdict is undefined");
  });
});

describe("scrubPath", () => {
  it("keeps the path and drops the query string and tokens", () => {
    expect(scrubPath("/dashboard?from=2026-10-01")).toBe("/dashboard");
    expect(scrubPath("/join/AbCdEfGh123456789012?x=1#y")).toBe("/join/[token]");
  });

  it("refuses anything that isn't a path", () => {
    expect(scrubPath("https://evil.example/")).toBeNull();
    expect(scrubPath("")).toBeNull();
    expect(scrubPath(null)).toBeNull();
  });
});

describe("normalizeForFingerprint", () => {
  it("groups messages that differ only in numbers or case", () => {
    expect(normalizeForFingerprint("Timeout after 10012 ms")).toBe(normalizeForFingerprint("timeout after 9876 ms"));
  });
});

describe("describeError", () => {
  it("reads Errors, Supabase error objects, strings and anything else", () => {
    expect(describeError(new TypeError("x is undefined"))).toBe("TypeError: x is undefined");
    expect(describeError(Object.assign(new Error("Email rate limit exceeded"), { code: "over_email_send_rate_limit" }))).toBe(
      "Error: Email rate limit exceeded (over_email_send_rate_limit)",
    );
    expect(describeError({ code: "PGRST116", message: "No rows found" })).toBe("PGRST116 No rows found");
    expect(describeError("plain text")).toBe("plain text");
    expect(describeError(42)).toBe("Unknown error");
  });
});

describe("isBrowserNoise", () => {
  it("ignores dropped connections, cancelled requests and stale chunks", () => {
    for (const message of [
      "TypeError: Failed to fetch",
      "TypeError: Load failed",
      "TypeError: NetworkError when attempting to fetch resource.",
      "AbortError: The user aborted a request.",
      "ChunkLoadError: Loading chunk 123 failed.",
      "ResizeObserver loop completed with undelivered notifications.",
      "Script error.",
    ]) {
      expect(isBrowserNoise(message), message).toBe(true);
    }
  });

  it("keeps real bugs", () => {
    expect(isBrowserNoise("TypeError: Cannot read properties of undefined (reading 'verdict')")).toBe(false);
  });
});
