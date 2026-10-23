import { describe, expect, it } from "vitest";
import { getScenarios, getStrings } from "@/lib/content";
import { CARD_FIELDS, fieldText, flagsByField, segmentText } from "@/lib/highlight";

const scenarios = getScenarios("en-US");
const strings = getStrings("en-US");
const CHANNELS = ["email", "sms", "voicemail", "chat", "payment_request", "calendar_invite"];
const INDUSTRIES = ["general", "auto_dealer", "tax_cpa", "mortgage_title", "insurance"];

describe("scenario content (en-US)", () => {
  it("has 24 scenarios with unique ids", () => {
    expect(scenarios).toHaveLength(24);
    expect(new Set(scenarios.map((s) => s.id)).size).toBe(scenarios.length);
  });

  it("is about 60% scams and 40% legit", () => {
    const share = scenarios.filter((s) => s.verdict === "scam").length / scenarios.length;
    expect(share).toBeGreaterThanOrEqual(0.55);
    expect(share).toBeLessThanOrEqual(0.65);
  });

  it("has at least 4 auto dealer and 4 tax/CPA cards", () => {
    expect(scenarios.filter((s) => s.industry === "auto_dealer").length).toBeGreaterThanOrEqual(4);
    expect(scenarios.filter((s) => s.industry === "tax_cpa").length).toBeGreaterThanOrEqual(4);
  });

  it("covers every channel with at least 3 cards", () => {
    for (const channel of CHANNELS) {
      expect(scenarios.filter((s) => s.channel === channel).length, channel).toBeGreaterThanOrEqual(3);
    }
  });

  it("only uses fictional .example domains", () => {
    for (const s of scenarios) {
      const text = CARD_FIELDS.map((f) => fieldText(s, f)).join("\n");
      const domains = text.match(/\b[\w-]+(?:\.[\w-]+)*\.(?:com|net|org|gov|io|co|us|app)(?![\w-])/gi) ?? [];
      expect(domains, s.id).toEqual([]);
    }
  });

  describe.each(scenarios.map((s) => [s.id, s] as const))("%s", (_id, s) => {
    it("matches the schema", () => {
      expect(s.locale).toBe("en-US");
      expect(CHANNELS).toContain(s.channel);
      expect(INDUSTRIES).toContain(s.industry);
      expect([1, 2, 3, 4, 5]).toContain(s.difficulty);
      expect(s.sender.name.trim()).not.toBe("");
      expect(s.sender.address.trim()).not.toBe("");
      expect(s.body.trim()).not.toBe("");
      expect(s.tip.trim()).not.toBe("");
    });

    it("has consistent verdict fields", () => {
      if (s.verdict === "scam") {
        expect(s.redFlags.length).toBeGreaterThanOrEqual(2);
        expect(s.scamType).not.toBe("none");
        expect(Object.keys(strings.scamTypes)).toContain(s.scamType);
        expect(s.legitReason).toBeUndefined();
      } else {
        expect(s.redFlags).toEqual([]);
        expect(s.scamType).toBe("none");
        expect(s.legitReason?.trim()).toBeTruthy();
      }
    });

    it("has red flags whose targets are exact, non-overlapping substrings of the card", () => {
      expect(new Set(s.redFlags.map((f) => f.id)).size).toBe(s.redFlags.length);
      const byField = flagsByField(s);
      const placed = Object.values(byField).flat();
      expect(placed.map((f) => f.id).sort()).toEqual(s.redFlags.map((f) => f.id).sort());
      for (const field of CARD_FIELDS) {
        const highlighted = segmentText(fieldText(s, field), byField[field]).filter((seg) => seg.flag);
        expect(highlighted.length, `${field} overlaps`).toBe(byField[field].length);
      }
    });
  });
});
