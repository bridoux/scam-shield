import { describe, expect, it } from "vitest";
import { getScenarios, getStrings } from "@/lib/content";
import { CARD_FIELDS, fieldText, flagsByField, linkHost, segmentText } from "@/lib/highlight";

const scenarios = getScenarios("en-US");
const strings = getStrings("en-US");
const CHANNELS = ["email", "sms", "voicemail", "chat", "payment_request", "calendar_invite"];
const INDUSTRIES = ["general", "auto_dealer", "tax_cpa", "mortgage_title", "insurance"];
const LINK_CHANNELS = ["email", "sms", "chat", "calendar_invite", "payment_request"];
/** Raw URLs longer than this must be shown as a tappable link with a preview instead. */
const MAX_RAW_URL = 40;

describe("scenario content (en-US)", () => {
  it("has 100 scenarios with unique ids", () => {
    expect(scenarios).toHaveLength(100);
    expect(new Set(scenarios.map((s) => s.id)).size).toBe(scenarios.length);
  });

  it("is about 60% scams and 40% legit", () => {
    const share = scenarios.filter((s) => s.verdict === "scam").length / scenarios.length;
    expect(share).toBeGreaterThanOrEqual(0.55);
    expect(share).toBeLessThanOrEqual(0.65);
  });

  it("has enough cards for each target industry", () => {
    const minimums: Record<string, number> = { auto_dealer: 18, tax_cpa: 20, mortgage_title: 14, insurance: 14 };
    for (const [industry, min] of Object.entries(minimums)) {
      expect(scenarios.filter((s) => s.industry === industry).length, industry).toBeGreaterThanOrEqual(min);
    }
  });

  it("covers every channel with at least 3 cards", () => {
    for (const channel of CHANNELS) {
      expect(scenarios.filter((s) => s.channel === channel).length, channel).toBeGreaterThanOrEqual(3);
    }
  });

  it("only uses fictional .example domains", () => {
    for (const s of scenarios) {
      const text = [...CARD_FIELDS.map((f) => fieldText(s, f)), ...(s.links ?? []).map((l) => l.url)].join("\n");
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
      const byField = flagsByField(s, s.redFlags);
      const placed = Object.values(byField).flat();
      expect(placed.map((f) => f.id).sort()).toEqual(s.redFlags.map((f) => f.id).sort());
      for (const field of CARD_FIELDS) {
        const links = field === "body" ? s.links : [];
        const highlighted = segmentText(fieldText(s, field), byField[field], links).filter((seg) => seg.flag);
        expect(highlighted.length, `${field} overlaps`).toBe(byField[field].length);
      }
    });

    it("has links that are exact body text and either match a red flag or stay clear of them", () => {
      const links = s.links ?? [];
      if (links.length > 0) expect(LINK_CHANNELS).toContain(s.channel);
      expect(new Set(links.map((l) => l.text)).size).toBe(links.length);
      const linkSegments = segmentText(s.body, [], links).filter((seg) => seg.link);
      expect(linkSegments.length, "links overlap each other or are missing from the body").toBe(links.length);

      const bodyFlags = flagsByField(s, s.redFlags).body;
      for (const link of links) {
        expect(linkHost(link.url), link.url).toMatch(/\.example$/);
        const start = s.body.indexOf(link.text);
        const end = start + link.text.length;
        for (const f of bodyFlags) {
          const fStart = s.body.indexOf(f.target);
          const fEnd = fStart + f.target.length;
          const overlaps = fStart < end && start < fEnd;
          const exact = fStart === start && fEnd === end;
          expect(!overlaps || exact, `link "${link.text}" partly overlaps flag ${f.id}`).toBe(true);
        }
      }
    });

    it("shows long or disguised URLs as tappable links, not raw text", () => {
      for (const url of s.body.match(/https?:\/\/\S+/g) ?? []) {
        expect(url.length, `raw URL in body: ${url}`).toBeLessThanOrEqual(MAX_RAW_URL);
      }
    });
  });
});
