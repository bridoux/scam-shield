import { describe, expect, it } from "vitest";
import { isTimeZone, localDate } from "./dates";

describe("localDate", () => {
  // 03:30 UTC on Oct 23 is still Oct 22 on the US west coast.
  const now = new Date("2026-10-23T03:30:00Z");

  it("uses the company's time zone to pick the day", () => {
    expect(localDate(now, "America/Los_Angeles")).toBe("2026-10-22");
    expect(localDate(now, "America/New_York")).toBe("2026-10-22");
    expect(localDate(now, "Europe/Paris")).toBe("2026-10-23");
  });

  it("falls back to UTC for an unknown zone", () => {
    expect(localDate(now, "Mars/Olympus_Mons")).toBe("2026-10-23");
    expect(localDate(now, "")).toBe("2026-10-23");
  });
});

describe("isTimeZone", () => {
  it("accepts IANA zones and rejects junk", () => {
    expect(isTimeZone("America/Chicago")).toBe(true);
    expect(isTimeZone("UTC")).toBe(true);
    expect(isTimeZone("Not/AZone")).toBe(false);
    expect(isTimeZone("x".repeat(65))).toBe(false);
  });
});
