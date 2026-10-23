import { describe, expect, it } from "vitest";
import { getScenarios } from "./content";
import {
  POINTS_PER_CORRECT,
  ROUND_SIZE,
  STREAK_BONUS,
  pickRound,
  scoreAnswer,
  seededRng,
  shuffle,
  summarizeRound,
  type AnswerResult,
} from "./round";
import type { Scenario, Verdict } from "./types";

const pool = getScenarios("en-US");

function answerAll(round: Scenario[], choices: Verdict[]): AnswerResult[] {
  const answers: AnswerResult[] = [];
  let streak = 0;
  round.forEach((s, i) => {
    const a = scoreAnswer(s, choices[i], streak);
    streak = a.streak;
    answers.push(a);
  });
  return answers;
}

const flip = (v: Verdict): Verdict => (v === "scam" ? "legit" : "scam");

describe("shuffle", () => {
  it("keeps every item and does not mutate the input", () => {
    const input = [1, 2, 3, 4, 5, 6];
    const out = shuffle(input, seededRng(1));
    expect(out).toHaveLength(6);
    expect([...out].sort()).toEqual(input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe("pickRound", () => {
  it("picks 10 unique cards", () => {
    const round = pickRound(pool, { rng: seededRng(42) });
    expect(round).toHaveLength(ROUND_SIZE);
    expect(new Set(round.map((s) => s.id)).size).toBe(ROUND_SIZE);
  });

  it("is reproducible with the same seed and varies across seeds", () => {
    const ids = (seed: number) => pickRound(pool, { rng: seededRng(seed) }).map((s) => s.id);
    expect(ids(7)).toEqual(ids(7));
    const distinct = new Set([1, 2, 3, 4, 5].map((seed) => ids(seed).join(",")));
    expect(distinct.size).toBeGreaterThan(1);
  });

  it.each(Array.from({ length: 50 }, (_, i) => i + 1))(
    "mixes channels, difficulties and verdicts (seed %i)",
    (seed) => {
      const round = pickRound(pool, { rng: seededRng(seed) });
      const channels = new Set(round.map((s) => s.channel));
      const difficulties = new Set(round.map((s) => s.difficulty));
      const scams = round.filter((s) => s.verdict === "scam").length;
      expect(channels.size).toBe(6);
      expect(difficulties.size).toBeGreaterThanOrEqual(4);
      expect(scams).toBeGreaterThanOrEqual(5);
      expect(scams).toBeLessThanOrEqual(7);
    },
  );

  it("handles a pool smaller than the round size", () => {
    expect(pickRound(pool.slice(0, 4), { rng: seededRng(3) })).toHaveLength(4);
  });

  it("still fills the round when one verdict is scarce", () => {
    const scamsOnly = pool.filter((s) => s.verdict === "scam");
    const round = pickRound(scamsOnly, { rng: seededRng(3) });
    expect(round).toHaveLength(ROUND_SIZE);
  });
});

describe("scoreAnswer", () => {
  const scam = pool.find((s) => s.verdict === "scam")!;

  it("awards base points for a correct answer", () => {
    expect(scoreAnswer(scam, "scam", 0)).toMatchObject({
      correct: true,
      streak: 1,
      basePoints: POINTS_PER_CORRECT,
      bonusPoints: 0,
    });
  });

  it("awards the streak bonus from the 3rd correct answer in a row", () => {
    expect(scoreAnswer(scam, "scam", 1).bonusPoints).toBe(0);
    expect(scoreAnswer(scam, "scam", 2)).toMatchObject({ streak: 3, bonusPoints: STREAK_BONUS });
    expect(scoreAnswer(scam, "scam", 5).bonusPoints).toBe(STREAK_BONUS);
  });

  it("resets the streak and awards nothing for a wrong answer", () => {
    expect(scoreAnswer(scam, "legit", 4)).toMatchObject({
      correct: false,
      streak: 0,
      basePoints: 0,
      bonusPoints: 0,
    });
  });
});

describe("summarizeRound", () => {
  const round = pickRound(pool, { rng: seededRng(11) });

  it("scores a perfect round: 10 x 10 + 8 streak bonuses", () => {
    const summary = summarizeRound(round, answerAll(round, round.map((s) => s.verdict)));
    expect(summary).toMatchObject({
      total: 10,
      correct: 10,
      accuracy: 100,
      basePoints: 100,
      bonusPoints: 40,
      points: 140,
      bestStreak: 10,
      missedScams: [],
      falseAlarms: 0,
    });
  });

  it("scores a round with every answer wrong", () => {
    const summary = summarizeRound(round, answerAll(round, round.map((s) => flip(s.verdict))));
    const scams = round.filter((s) => s.verdict === "scam");
    expect(summary.points).toBe(0);
    expect(summary.accuracy).toBe(0);
    expect(summary.falseAlarms).toBe(10 - scams.length);
    expect(summary.missedScams.reduce((n, m) => n + m.count, 0)).toBe(scams.length);
  });

  it("breaks a streak and restarts the bonus count", () => {
    // correct x3, wrong, correct x3, wrong, correct x2
    const pattern = [1, 1, 1, 0, 1, 1, 1, 0, 1, 1];
    const choices = round.map((s, i) => (pattern[i] ? s.verdict : flip(s.verdict)));
    const summary = summarizeRound(round, answerAll(round, choices));
    expect(summary.correct).toBe(8);
    expect(summary.accuracy).toBe(80);
    expect(summary.basePoints).toBe(80);
    expect(summary.bonusPoints).toBe(2 * STREAK_BONUS);
    expect(summary.bestStreak).toBe(3);
  });

  it("groups missed scams by type, most-missed first", () => {
    const s = (id: string, scamType: string): Scenario => ({
      ...pool[0],
      id,
      scamType,
      verdict: "scam",
    });
    const custom = [s("a", "gift_card"), s("b", "wire_change"), s("c", "wire_change")];
    const summary = summarizeRound(custom, answerAll(custom, ["legit", "legit", "legit"]));
    expect(summary.missedScams).toEqual([
      { scamType: "wire_change", count: 2 },
      { scamType: "gift_card", count: 1 },
    ]);
  });

  it("handles an empty round", () => {
    expect(summarizeRound([], [])).toMatchObject({ total: 0, accuracy: 0, points: 0 });
  });
});
