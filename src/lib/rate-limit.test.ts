import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { clientIpFrom, LIMITS, limitKey } = await import("./rate-limit");

describe("limitKey", () => {
  it("hashes the subject so no raw IP or email is stored", () => {
    const key = limitKey("signInEmail", "dana@dealer.example");
    expect(key).toMatch(/^signInEmail:[0-9a-f]{64}$/);
    expect(key).not.toContain("dana");
  });

  it("is stable per subject and separate per limit", () => {
    expect(limitKey("invite", "u1")).toBe(limitKey("invite", "u1"));
    expect(limitKey("invite", "u1")).not.toBe(limitKey("invite", "u2"));
    expect(limitKey("invite", "u1").split(":")[1]).toBe(limitKey("recordDownload", "u1").split(":")[1]);
  });

  it("fits the database column (128 characters)", () => {
    for (const name of Object.keys(LIMITS) as (keyof typeof LIMITS)[]) {
      expect(limitKey(name, "x".repeat(500)).length).toBeLessThanOrEqual(128);
    }
  });
});

describe("clientIpFrom", () => {
  it("takes the first forwarded address", () => {
    expect(clientIpFrom("203.0.113.7, 10.0.0.1", null)).toBe("203.0.113.7");
  });

  it("falls back to X-Real-IP, then to unknown", () => {
    expect(clientIpFrom(null, " 198.51.100.2 ")).toBe("198.51.100.2");
    expect(clientIpFrom("", null)).toBe("unknown");
  });
});
