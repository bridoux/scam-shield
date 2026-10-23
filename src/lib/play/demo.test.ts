import { describe, expect, it } from "vitest";
import { getScenarios } from "../content";
import { REVEAL_FIELDS } from "../types";
import { PlayError } from "./core";
import { answerDemoCard, openDemo, sealDemo, startDemoRound } from "./demo";

const pool = getScenarios("en-US");
const SECRET = "test-secret";

function codeOf(fn: () => unknown): string {
  try {
    fn();
  } catch (error) {
    if (error instanceof PlayError) return error.code;
    throw error;
  }
  throw new Error("expected a PlayError");
}

describe("demo rounds", () => {
  it("deal public cards only, with no scenario ids readable in the token", () => {
    const round = startDemoRound(pool, SECRET);
    expect(round.cards).toHaveLength(10);
    for (const card of round.cards) {
      for (const field of REVEAL_FIELDS) expect(card).not.toHaveProperty(field);
    }
    const decoded = Buffer.from(round.roundId, "base64url").toString("latin1");
    for (const s of pool) expect(decoded).not.toContain(s.id);
  });

  it("reveal a card only when it is answered, and score the streak", () => {
    const now = 1_000_000;
    const round = startDemoRound(pool, SECRET, now);
    const { ids } = openDemo(round.roundId, SECRET, now);
    const answered = answerDemoCard(pool, SECRET, round.roundId, 3, "scam", 2, now);
    const scenario = pool.find((s) => s.id === ids[3])!;
    expect(answered.reveal.id).toBe(scenario.id);
    expect(answered.reveal.verdict).toBe(scenario.verdict);
    expect(answered.result.correct).toBe(scenario.verdict === "scam");
    expect(answered.result.streak).toBe(answered.result.correct ? 3 : 0);
    expect(answered.result.bonusPoints).toBe(answered.result.correct ? 5 : 0);
  });

  it("reject tampered, foreign or expired tokens and bad input", () => {
    const now = 1_000_000;
    const { roundId } = startDemoRound(pool, SECRET, now);
    const raw = Buffer.from(roundId, "base64url");
    raw[raw.length - 20] ^= 1;
    expect(codeOf(() => answerDemoCard(pool, SECRET, raw.toString("base64url"), 0, "scam", 0, now))).toBe("not_found");
    expect(codeOf(() => answerDemoCard(pool, "other-secret", roundId, 0, "scam", 0, now))).toBe("not_found");
    expect(codeOf(() => answerDemoCard(pool, SECRET, roundId, 0, "scam", 0, now + 3 * 60 * 60 * 1000))).toBe("not_found");
    expect(codeOf(() => answerDemoCard(pool, SECRET, roundId, 99, "scam", 0, now))).toBe("not_found");
    expect(codeOf(() => answerDemoCard(pool, SECRET, roundId, 0, "maybe" as "scam", 0, now))).toBe("invalid_input");
    expect(codeOf(() => answerDemoCard(pool, SECRET, roundId, 0, "scam", -1, now))).toBe("invalid_input");
  });

  it("round-trip a sealed payload", () => {
    const payload = { ids: ["a", "b"], exp: 5 };
    expect(openDemo(sealDemo(payload, SECRET), SECRET, 1)).toEqual(payload);
  });
});
