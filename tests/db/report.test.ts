import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, anonClient, cleanup, createCompany, createTestUser, joinCompany, playRound, type TestUser } from "./helpers";

describe("training record functions", () => {
  let owner: TestUser;
  let manager: TestUser;
  let player: TestUser;
  let rival: TestUser;
  let orgA: string;
  let orgB: string;
  // Tuesday 2026-10-20 at noon in Chicago (the test companies' time zone).
  const day = new Date("2026-10-20T17:00:00Z");
  const range = { p_from: "2026-10-01", p_to: "2026-10-31" };

  beforeAll(async () => {
    [owner, manager, player, rival] = await Promise.all([
      createTestUser("rec-owner"),
      createTestUser("rec-admin"),
      createTestUser("rec-player"),
      createTestUser("rec-rival"),
    ]);
    [orgA, orgB] = await Promise.all([createCompany(owner, "Record A"), createCompany(rival, "Record B")]);
    await joinCompany(owner, manager, orgA, "Manager A");
    await joinCompany(owner, player, orgA, "Player A");
    const promote = await admin.from("memberships").update({ role: "admin" }).eq("user_id", manager.id);
    if (promote.error) throw promote.error;

    await playRound(player.id, day); // record round
    await playRound(player.id, day); // practice: must not count
    await playRound(rival.id, day);
  }, 240_000);

  afterAll(async () => {
    await cleanup([owner, manager, player, rival].filter(Boolean), [orgA, orgB].filter(Boolean));
  });

  it("gives the owner every member of their company, with emails, counting record rounds only", async () => {
    const { data, error } = await owner.client.rpc("training_report", range);
    expect(error).toBeNull();
    expect((data ?? []).map((r) => r.user_id).sort()).toEqual([owner.id, manager.id, player.id].sort());

    const row = data!.find((r) => r.user_id === player.id)!;
    expect(row.email).toBe(player.email);
    expect(row.round_dates).toEqual(["2026-10-20"]);
    expect(row.cards).toBe(10); // the practice round's 10 cards are excluded
    expect(row.role).toBe("player");
  });

  it("lets an admin read it too, but never a player", async () => {
    const asAdmin = await manager.client.rpc("training_report", range);
    expect(asAdmin.error).toBeNull();
    expect(asAdmin.data).toHaveLength(3);

    const asPlayer = await player.client.rpc("training_report", range);
    expect(asPlayer.error?.hint).toBe("not_authorized");
    const topics = await player.client.rpc("training_topics", range);
    expect(topics.error?.hint).toBe("not_authorized");
  });

  it("keeps each company's record to itself", async () => {
    const { data } = await rival.client.rpc("training_report", range);
    expect((data ?? []).map((r) => r.user_id)).toEqual([rival.id]);
    expect(JSON.stringify(data)).not.toContain(player.email);
  });

  it("summarises topics from record rounds only", async () => {
    const { data, error } = await owner.client.rpc("training_topics", range);
    expect(error).toBeNull();
    const attempts = (data ?? []).reduce((sum, t) => sum + t.attempts, 0);
    expect(attempts).toBe(10);
  });

  it("rejects bad periods and signed-out callers", async () => {
    const backwards = await owner.client.rpc("training_report", { p_from: "2026-10-31", p_to: "2026-10-01" });
    expect(backwards.error?.hint).toBe("invalid_period");
    const tooLong = await owner.client.rpc("training_report", { p_from: "2024-01-01", p_to: "2026-10-31" });
    expect(tooLong.error?.hint).toBe("invalid_period");

    const anon = await anonClient().rpc("training_report", range);
    expect(anon.error).not.toBeNull();
    expect(anon.data ?? []).toEqual([]);
  });
});
