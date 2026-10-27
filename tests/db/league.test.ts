import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { finishRound, startRound, submitAnswer } from "@/lib/play/core";
import { admin, anonClient, cleanup, createCompany, createTestUser, type TestUser } from "./helpers";

/** Plays a whole round on the server, answering "scam" to everything. Returns its id and cards. */
async function playRound(userId: string, now: Date) {
  const round = await startRound(admin, userId, { now });
  for (let i = round.answered.length; i < round.cards.length; i++) {
    await submitAnswer(admin, userId, round.roundId, i, "scam");
  }
  const finished = await finishRound(admin, userId, round.roundId);
  return { ...round, finished };
}

async function seenScenarioIds(roundId: string): Promise<string[]> {
  const { data } = await admin.from("round_answers").select("scenario_id").eq("round_id", roundId);
  return (data ?? []).map((r) => r.scenario_id);
}

describe("weekly league, play days and adaptive rounds", () => {
  let owner: TestUser;
  let player: TestUser;
  let rival: TestUser;
  let orgA: string;
  let orgB: string;
  // A Wednesday at noon in Chicago (the test companies' time zone).
  const day1 = new Date("2026-10-21T17:00:00Z");
  const day2 = new Date("2026-10-22T17:00:00Z");
  const monday = "2026-10-19";
  let ownerPoints = 0;

  beforeAll(async () => {
    [owner, player, rival] = await Promise.all([createTestUser("owner"), createTestUser("player"), createTestUser("rival")]);
    [orgA, orgB] = await Promise.all([createCompany(owner, "League A"), createCompany(rival, "League B")]);

    const { data: invite, error } = await owner.client
      .from("invites")
      .insert({ organization_id: orgA, created_by: owner.id })
      .select("token")
      .single();
    if (error) throw error;
    const joined = await player.client.rpc("accept_invite", { invite_token: invite.token, member_display_name: "Player A" });
    if (joined.error) throw joined.error;

    const record = await playRound(owner.id, day1);
    ownerPoints = record.finished.summary.points;
    await playRound(owner.id, day1); // practice: must not count
    await playRound(rival.id, day1);
  }, 240_000); // three full rounds against the hosted database

  afterAll(async () => {
    await cleanup([owner, player, rival].filter(Boolean), [orgA, orgB].filter(Boolean));
  });

  it("shows every member of my company, and only my company", async () => {
    const { data, error } = await player.client.rpc("weekly_league", { week_start: monday });
    expect(error).toBeNull();
    const ids = (data ?? []).map((r) => r.user_id).sort();
    expect(ids).toEqual([owner.id, player.id].sort());

    const { data: rivalView } = await rival.client.rpc("weekly_league", { week_start: monday });
    expect((rivalView ?? []).map((r) => r.user_id)).toEqual([rival.id]);
  });

  it("counts record rounds only, and only within the week", async () => {
    const { data } = await player.client.rpc("weekly_league", { week_start: monday });
    const ownerRow = data?.find((r) => r.user_id === owner.id);
    expect(ownerRow?.rounds).toBe(1);
    expect(ownerRow?.points).toBe(ownerPoints);
    expect(data?.find((r) => r.user_id === player.id)).toMatchObject({ rounds: 0, points: 0 });

    const { data: nextWeek } = await player.client.rpc("weekly_league", { week_start: "2026-10-26" });
    expect(nextWeek?.every((r) => r.rounds === 0)).toBe(true);
  });

  it("only answers for whole weeks starting on a Monday", async () => {
    const { data, error } = await player.client.rpc("weekly_league", { week_start: "2026-10-21" });
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("gives signed-out visitors nothing", async () => {
    const { data, error } = await anonClient().rpc("weekly_league", { week_start: monday });
    expect(error).not.toBeNull();
    expect(data ?? []).toEqual([]);
  });

  it("lets only the owner change play days, and cleans the list", async () => {
    const asPlayer = await player.client.rpc("set_play_days", { days: [1, 2, 3] });
    expect(asPlayer.error?.hint).toBe("not_owner");

    const empty = await owner.client.rpc("set_play_days", { days: [9] });
    expect(empty.error?.hint).toBe("no_days");

    const saved = await owner.client.rpc("set_play_days", { days: [6, 1, 2, 2, 3, 4, 5] });
    expect(saved.error).toBeNull();
    expect(saved.data).toEqual([1, 2, 3, 4, 5, 6]);

    const direct = await owner.client.from("organizations").update({ play_days: [7] }).eq("id", orgA);
    expect(direct.error).not.toBeNull();

    const { data: org } = await admin.from("organizations").select("play_days").eq("id", orgA).single();
    expect(org?.play_days).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("doesn't repeat yesterday's cards in today's round", { timeout: 180_000 }, async () => {
    const first = await playRound(player.id, day1);
    const second = await playRound(player.id, day2);
    const yesterday = new Set(await seenScenarioIds(first.roundId));
    const today = await seenScenarioIds(second.roundId);
    expect(today).toHaveLength(10);
    expect(today.filter((id) => yesterday.has(id))).toEqual([]);
  });
});
