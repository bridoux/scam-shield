import { describe, expect, it } from "vitest";
import { getScenarios } from "../content";
import { seededRng } from "../round";
import type { Scenario } from "../types";
import { addDays } from "./calendar";
import {
  buildProfile,
  cardWeight,
  freshCards,
  NO_REPEAT_DAYS,
  pickAdaptiveRound,
  targetDifficulty,
  type PastAnswer,
} from "./adaptive";

const pool = getScenarios("en-US");
const TODAY = "2026-10-24";
const empty = buildProfile([]);

function answered(cards: readonly Scenario[], day: string, correct = true): PastAnswer[] {
  return cards.map((s) => ({ scenarioId: s.id, scamType: s.scamType, correct, day }));
}

describe("buildProfile", () => {
  it("tracks last seen day, misses per scam type and recent accuracy", () => {
    const [a, b] = pool.filter((s) => s.verdict === "scam");
    const profile = buildProfile([
      { scenarioId: a.id, scamType: "wire_change", correct: false, day: "2026-10-01" },
      { scenarioId: a.id, scamType: "wire_change", correct: true, day: "2026-10-10" },
      { scenarioId: b.id, scamType: "gift_card", correct: true, day: "2026-10-05" },
    ]);
    expect(profile.lastSeen.get(a.id)).toBe("2026-10-10");
    expect(profile.byType.get("wire_change")).toEqual({ attempts: 2, misses: 1 });
    expect(profile.recentAccuracy).toBeCloseTo(2 / 3);
  });

  it("starts new players at a middle difficulty", () => {
    expect(empty.recentAccuracy).toBeNull();
    expect(targetDifficulty(empty)).toBe(2.5);
  });
});

describe("cardWeight", () => {
  const scam = (overrides: Partial<Scenario>): Scenario => ({ ...pool.find((s) => s.verdict === "scam")!, ...overrides });

  it("prefers the company's industry over other industries", () => {
    const own = cardWeight(scam({ industry: "auto_dealer" }), empty, "auto_dealer");
    const other = cardWeight(scam({ industry: "insurance" }), empty, "auto_dealer");
    const general = cardWeight(scam({ industry: "general" }), empty, "auto_dealer");
    expect(own).toBeGreaterThan(general);
    expect(general).toBeGreaterThan(other);
  });

  it("favors scam types the player keeps missing", () => {
    const profile = buildProfile([
      ...Array.from({ length: 4 }, () => ({ scenarioId: "x", scamType: "wire_change", correct: false, day: TODAY })),
      ...Array.from({ length: 4 }, () => ({ scenarioId: "y", scamType: "gift_card", correct: true, day: TODAY })),
    ]);
    const weak = cardWeight(scam({ scamType: "wire_change", industry: "general" }), profile, "general");
    const strong = cardWeight(scam({ scamType: "gift_card", industry: "general" }), profile, "general");
    expect(weak).toBeGreaterThan(strong * 2);
  });

  it("matches difficulty to recent accuracy", () => {
    const sharp = buildProfile(answered(pool.slice(0, 20), TODAY, true));
    const struggling = buildProfile(answered(pool.slice(0, 20), TODAY, false));
    const hard = scam({ difficulty: 5, industry: "general", scamType: "none_seen" });
    const easy = scam({ difficulty: 1, industry: "general", scamType: "none_seen" });
    expect(cardWeight(hard, sharp, "general")).toBeGreaterThan(cardWeight(easy, sharp, "general"));
    expect(cardWeight(easy, struggling, "general")).toBeGreaterThan(cardWeight(hard, struggling, "general"));
  });
});

describe("freshCards", () => {
  it("drops cards seen in the last 30 days but brings them back after", () => {
    const seenYesterday = buildProfile(answered(pool.slice(0, 5), addDays(TODAY, -1)));
    const fresh = freshCards(pool, seenYesterday, TODAY, 10);
    expect(fresh.some((s) => pool.slice(0, 5).includes(s))).toBe(false);

    const seenLongAgo = buildProfile(answered(pool.slice(0, 5), addDays(TODAY, -NO_REPEAT_DAYS)));
    expect(freshCards(pool, seenLongAgo, TODAY, 10)).toHaveLength(pool.length);
  });

  it("tops up with the least recently seen cards when almost everything was seen", () => {
    const old = pool.slice(0, 10);
    const recent = pool.slice(10);
    const profile = buildProfile([...answered(old, addDays(TODAY, -20)), ...answered(recent, addDays(TODAY, -2))]);
    const result = freshCards(pool, profile, TODAY, 10);
    expect(result).toHaveLength(10);
    expect(new Set(result)).toEqual(new Set(old));
  });
});

describe("pickAdaptiveRound", () => {
  it("keeps the round shape: 10 unique cards, both verdicts, several channels", () => {
    for (let seed = 1; seed <= 25; seed++) {
      const round = pickAdaptiveRound(pool, empty, { today: TODAY, industry: "tax_cpa", rng: seededRng(seed) });
      expect(round).toHaveLength(10);
      expect(new Set(round.map((s) => s.id)).size).toBe(10);
      const scams = round.filter((s) => s.verdict === "scam").length;
      expect(scams).toBeGreaterThanOrEqual(5);
      expect(scams).toBeLessThanOrEqual(7);
      expect(new Set(round.map((s) => s.channel)).size).toBeGreaterThanOrEqual(4);
    }
  });

  it("never repeats a card from yesterday while fresh cards remain", () => {
    const yesterday = pickAdaptiveRound(pool, empty, { today: addDays(TODAY, -1), industry: "general", rng: seededRng(7) });
    const profile = buildProfile(answered(yesterday, addDays(TODAY, -1)));
    const today = pickAdaptiveRound(pool, profile, { today: TODAY, industry: "general", rng: seededRng(8) });
    expect(today.some((s) => yesterday.includes(s))).toBe(false);
  });

  it("leans toward the company's industry over many rounds", () => {
    let own = 0;
    let other = 0;
    for (let seed = 1; seed <= 40; seed++) {
      for (const s of pickAdaptiveRound(pool, empty, { today: TODAY, industry: "mortgage_title", rng: seededRng(seed) })) {
        if (s.industry === "mortgage_title") own++;
        else if (s.industry !== "general") other++;
      }
    }
    const ownShare = own / pool.filter((s) => s.industry === "mortgage_title").length;
    const otherShare = other / pool.filter((s) => s.industry !== "mortgage_title" && s.industry !== "general").length;
    expect(ownShare).toBeGreaterThan(otherShare * 2);
  });
});
