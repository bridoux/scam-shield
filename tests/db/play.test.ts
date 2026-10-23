import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { finishRound, PlayError, startRound, submitAnswer } from "@/lib/play/core";
import { REVEAL_FIELDS } from "@/lib/types";
import { admin, cleanup, createCompany, createTestUser, type TestUser } from "./helpers";

async function playErrorCode(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof PlayError) return error.code;
    throw error;
  }
  throw new Error("expected a PlayError");
}

describe("server-checked play", () => {
  let player: TestUser;
  let other: TestUser;
  let orgs: string[] = [];

  beforeAll(async () => {
    [player, other] = await Promise.all([createTestUser("player"), createTestUser("other")]);
    orgs = await Promise.all([createCompany(player, "Player Co"), createCompany(other, "Other Co")]);
  });

  afterAll(async () => {
    await cleanup([player, other].filter(Boolean), orgs);
  });

  it("deals cards without verdicts, and the client can't read ahead through the API", async () => {
    const round = await startRound(admin, player.id);
    expect(round.isPractice).toBe(false);
    expect(round.cards).toHaveLength(10);
    expect(round.answered).toEqual([]);
    for (const card of round.cards) {
      for (const field of REVEAL_FIELDS) expect(card).not.toHaveProperty(field);
    }

    // The planned scenario ids exist, but RLS hides unanswered rows from the player.
    const { data: planned } = await admin.from("round_answers").select("position").eq("round_id", round.roundId);
    expect(planned).toHaveLength(10);
    const { data: visible } = await player.client.from("round_answers").select("scenario_id").eq("round_id", round.roundId);
    expect(visible).toEqual([]);
  });

  it("checks answers in order, returns the reveal only after answering, and is idempotent", async () => {
    const round = await startRound(admin, player.id); // resumes the open round
    const { roundId } = round;

    expect(await playErrorCode(submitAnswer(admin, player.id, roundId, 1, "scam"))).toBe("out_of_order");
    expect(await playErrorCode(submitAnswer(admin, other.id, roundId, 0, "scam"))).toBe("not_found");
    expect(await playErrorCode(finishRound(admin, player.id, roundId))).toBe("incomplete");

    const first = await submitAnswer(admin, player.id, roundId, 0, "scam");
    expect(first.reveal.verdict).toMatch(/^(scam|legit)$/);
    expect(first.result.correct).toBe(first.reveal.verdict === "scam");
    const repeat = await submitAnswer(admin, player.id, roundId, 0, "legit");
    expect(repeat).toEqual(first);

    // Once answered, the player may read that card back.
    const { data: visible } = await player.client.from("round_answers").select("position").eq("round_id", roundId);
    expect(visible).toEqual([{ position: 0 }]);
  });

  it("resumes with earlier answers, saves the result, and makes extra rounds practice", async () => {
    const resumed = await startRound(admin, player.id);
    expect(resumed.answered).toHaveLength(1);
    const { roundId, cards } = resumed;

    let expectedPoints = resumed.answered[0].result.basePoints + resumed.answered[0].result.bonusPoints;
    for (let i = 1; i < cards.length; i++) {
      const { result } = await submitAnswer(admin, player.id, roundId, i, i % 2 ? "legit" : "scam");
      expectedPoints += result.basePoints + result.bonusPoints;
    }

    const finished = await finishRound(admin, player.id, roundId);
    expect(finished.isPractice).toBe(false);
    expect(finished.summary.total).toBe(10);
    expect(finished.summary.points).toBe(expectedPoints);

    const { data: saved } = await player.client.from("rounds").select("score, points, best_streak, completed_at").eq("id", roundId).single();
    expect(saved?.points).toBe(expectedPoints);
    expect(saved?.score).toBe(finished.summary.correct);
    expect(saved?.completed_at).not.toBeNull();

    expect(await playErrorCode(submitAnswer(admin, player.id, roundId, 0, "scam"))).toBe("round_closed");

    const practice = await startRound(admin, player.id);
    expect(practice.isPractice).toBe(true);
    expect(practice.roundId).not.toBe(roundId);
  });

  it("refuses to play for someone without a company", async () => {
    const loner = await createTestUser("loner");
    try {
      expect(await playErrorCode(startRound(admin, loner.id))).toBe("no_membership");
    } finally {
      await cleanup([loner], []);
    }
  });
});
