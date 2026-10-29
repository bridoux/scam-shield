import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { clientIpFrom, emailSubject, LIMITS, limitKey } = await import("./rate-limit");

const SECRET = "test-secret";

describe("limitKey", () => {
  it("is a keyed hash, so no raw IP or email is stored or guessable without the secret", () => {
    const key = limitKey("signInEmail", "dana@dealer.example", SECRET);
    expect(key).toMatch(/^signInEmail:[0-9a-f]{64}$/);
    expect(key).not.toContain("dana");
    expect(limitKey("signInEmail", "dana@dealer.example", "other-secret")).not.toBe(key);
  });

  it("is stable per subject and separate per limit", () => {
    expect(limitKey("invite", "u1", SECRET)).toBe(limitKey("invite", "u1", SECRET));
    expect(limitKey("invite", "u1", SECRET)).not.toBe(limitKey("invite", "u2", SECRET));
    expect(limitKey("invite", "u1", SECRET)).not.toBe(limitKey("recordDownload", "u1", SECRET));
  });

  it("fits the database column (128 characters)", () => {
    for (const name of Object.keys(LIMITS) as (keyof typeof LIMITS)[]) {
      expect(limitKey(name, "x".repeat(500), SECRET).length).toBeLessThanOrEqual(128);
    }
  });
});

describe("emailSubject", () => {
  it("folds case and plus-address variants into one subject", () => {
    expect(emailSubject(" Dana+test@Dealer.example ")).toBe("dana@dealer.example");
    expect(emailSubject("dana@dealer.example")).toBe("dana@dealer.example");
  });
});

describe("clientIpFrom", () => {
  it("prefers Vercel's own header, then the first forwarded address", () => {
    expect(clientIpFrom("198.51.100.9", "203.0.113.7, 10.0.0.1", null)).toBe("198.51.100.9");
    expect(clientIpFrom(null, "203.0.113.7, 10.0.0.1", null)).toBe("203.0.113.7");
  });

  it("falls back to X-Real-IP, then to null (no shared 'unknown' bucket)", () => {
    expect(clientIpFrom(null, null, " 198.51.100.2 ")).toBe("198.51.100.2");
    expect(clientIpFrom(null, "", null)).toBeNull();
  });
});
