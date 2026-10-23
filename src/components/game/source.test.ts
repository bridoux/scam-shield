import { describe, expect, it } from "vitest";
import { getScenarios } from "@/lib/content";
import { answerDemoCard, startDemoRound } from "@/lib/play/demo";
import { createDemoSource, type DemoServer } from "./source";

const pool = getScenarios("en-US");
const SECRET = "test-secret";

/** Runs the real demo logic in-process instead of through server actions. */
function localServer(calls: number[]): DemoServer {
  return {
    async start() {
      return { ok: true, data: startDemoRound(pool, SECRET) };
    },
    async answer(token, position, choice, previousStreak) {
      calls.push(previousStreak);
      return { ok: true, data: answerDemoCard(pool, SECRET, token, position, choice, previousStreak) };
    },
  };
}

describe("createDemoSource", () => {
  it("answers in order, passes the running streak, and summarizes from the reveals", async () => {
    const streaks: number[] = [];
    const source = createDemoSource(localServer(streaks));
    const started = await source.start();
    if (!started.ok) throw new Error(started.error);
    const { roundId, cards } = started.data;

    expect(await source.answer(roundId, 1, "scam")).toEqual({ ok: false, error: "out_of_order" });
    expect(await source.finish(roundId)).toEqual({ ok: false, error: "incomplete" });

    const results = [];
    for (let i = 0; i < cards.length; i++) {
      const answered = await source.answer(roundId, i, i % 2 ? "legit" : "scam");
      if (!answered.ok) throw new Error(answered.error);
      results.push(answered.data.result);
    }
    expect(streaks).toEqual([0, ...results.slice(0, -1).map((r) => r.streak)]);

    const finished = await source.finish(roundId);
    if (!finished.ok) throw new Error(finished.error);
    expect(finished.data.summary.total).toBe(cards.length);
    expect(finished.data.summary.correct).toBe(results.filter((r) => r.correct).length);
  });
});
