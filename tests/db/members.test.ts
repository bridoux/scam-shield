import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { finishRound, PlayError, startRound, submitAnswer } from "@/lib/play/core";
import { localDate } from "@/lib/play/dates";
import { weekStart } from "@/lib/progress/calendar";
import { admin, cleanup, createCompany, createTestUser, joinCompany, playRound, type TestUser } from "./helpers";

const ZONE = "America/Chicago";

describe("member management", () => {
  let owner: TestUser;
  let manager: TestUser;
  let player: TestUser;
  let other: TestUser;
  let outsider: TestUser;
  let org: string;
  let outsiderOrg: string;
  let firstTeam: string;
  let outsiderTeam: string;

  beforeAll(async () => {
    [owner, manager, player, other, outsider] = await Promise.all([
      createTestUser("owner"),
      createTestUser("manager"),
      createTestUser("player"),
      createTestUser("other"),
      createTestUser("outsider"),
    ]);
    [org, outsiderOrg] = await Promise.all([createCompany(owner, "Members Co"), createCompany(outsider, "Elsewhere")]);
    await joinCompany(owner, manager, org, "Manager");
    await joinCompany(owner, player, org, "Player");
    await joinCompany(owner, other, org, "Other");
    const promoted = await owner.client.rpc("set_member_role", { target: manager.id, new_role: "admin" });
    if (promoted.error) throw promoted.error;

    const { data: teams } = await admin.from("teams").select("id, organization_id").in("organization_id", [org, outsiderOrg]);
    firstTeam = teams!.find((t) => t.organization_id === org)!.id;
    outsiderTeam = teams!.find((t) => t.organization_id === outsiderOrg)!.id;
  }, 120_000);

  afterAll(async () => {
    await cleanup([owner, manager, player, other, outsider].filter(Boolean), [org, outsiderOrg].filter(Boolean));
  });

  async function roleOf(user: TestUser) {
    const { data } = await admin.from("memberships").select("role").eq("user_id", user.id).single();
    return data?.role;
  }

  it("lets only the owner change roles, and never their own", async () => {
    const byAdmin = await manager.client.rpc("set_member_role", { target: player.id, new_role: "admin" });
    expect(byAdmin.error?.hint).toBe("not_authorized");
    const byPlayer = await player.client.rpc("set_member_role", { target: other.id, new_role: "admin" });
    expect(byPlayer.error?.hint).toBe("not_authorized");
    const self = await owner.client.rpc("set_member_role", { target: owner.id, new_role: "player" });
    expect(self.error?.hint).toBe("not_authorized");
    const toOwner = await owner.client.rpc("set_member_role", { target: other.id, new_role: "owner" });
    expect(toOwner.error?.hint).toBe("invalid");

    expect((await owner.client.rpc("set_member_role", { target: other.id, new_role: "admin" })).error).toBeNull();
    expect(await roleOf(other)).toBe("admin");
    expect((await owner.client.rpc("set_member_role", { target: other.id, new_role: "player" })).error).toBeNull();
    expect(await roleOf(other)).toBe("player");
  });

  it("lets admins manage players but not the owner, and nobody manage another company", async () => {
    const onOwner = await manager.client.rpc("set_member_active", { target: owner.id, active: false });
    expect(onOwner.error?.hint).toBe("not_authorized");
    const onSelf = await owner.client.rpc("set_member_active", { target: owner.id, active: false });
    expect(onSelf.error?.hint).toBe("not_authorized");
    const fromOutside = await outsider.client.rpc("set_member_active", { target: player.id, active: false });
    expect(fromOutside.error?.hint).toBe("not_found");
    const byPlayer = await player.client.rpc("set_member_team", { target: other.id, new_team: firstTeam });
    expect(byPlayer.error?.hint).toBe("not_authorized");
  });

  it("creates, renames and deletes only empty teams, within the company", async () => {
    const created = await manager.client.from("teams").insert({ organization_id: org, name: "Sales" }).select("id").single();
    expect(created.error).toBeNull();
    const sales = created.data!.id;

    expect((await manager.client.from("teams").update({ name: "Sales floor" }).eq("id", sales)).error).toBeNull();
    const moved = await manager.client.from("teams").update({ organization_id: outsiderOrg }).eq("id", sales);
    expect(moved.error).not.toBeNull();
    const byPlayer = await player.client.from("teams").insert({ organization_id: org, name: "Rogue" });
    expect(byPlayer.error).not.toBeNull();

    expect((await manager.client.rpc("set_member_team", { target: player.id, new_team: sales })).error).toBeNull();
    const foreign = await manager.client.rpc("set_member_team", { target: player.id, new_team: outsiderTeam });
    expect(foreign.error?.hint).toBe("invalid");

    await manager.client.from("teams").delete().eq("id", sales);
    expect((await admin.from("teams").select("name").eq("id", sales).single()).data?.name).toBe("Sales floor");

    expect((await manager.client.rpc("set_member_team", { target: player.id, new_team: firstTeam })).error).toBeNull();
    await manager.client.from("teams").delete().eq("id", sales);
    expect((await admin.from("teams").select("id").eq("id", sales)).data).toEqual([]);

    // Anyone managing can change their own team, including to no team (the generated types miss that null is allowed).
    expect((await manager.client.rpc("set_member_team", { target: manager.id, new_team: null as unknown as string })).error).toBeNull();
  });

  it("deactivating removes access at once but keeps the training record", async () => {
    await playRound(player.id, new Date());
    const open = await startRound(admin, player.id, { now: new Date() }); // a practice round, left unfinished
    expect((await manager.client.rpc("set_member_active", { target: player.id, active: false })).error).toBeNull();
    await expect(submitAnswer(admin, player.id, open.roundId, 0, "scam")).rejects.toMatchObject({ code: "no_membership" });
    await expect(finishRound(admin, player.id, open.roundId)).rejects.toMatchObject({ code: "no_membership" });
    const today = localDate(new Date(), ZONE);

    const own = await player.client.from("memberships").select("deactivated_at").eq("user_id", player.id).single();
    expect(own.data?.deactivated_at).not.toBeNull();
    expect((await player.client.from("organizations").select("id")).data).toEqual([]);
    expect((await player.client.from("memberships").select("user_id").neq("user_id", player.id)).data).toEqual([]);
    await expect(startRound(admin, player.id, { now: new Date() })).rejects.toBeInstanceOf(PlayError);
    await expect(startRound(admin, player.id, { now: new Date() })).rejects.toMatchObject({ code: "no_membership" });

    const league = await owner.client.rpc("weekly_league", { week_start: weekStart(today) });
    expect((league.data ?? []).map((r) => r.user_id)).not.toContain(player.id);

    const report = await owner.client.rpc("training_report", { p_from: today, p_to: today });
    const row = report.data?.find((r) => r.user_id === player.id);
    expect(row?.left_on).toBe(today);
    expect(row?.round_dates).toContain(today);

    const { data: invite } = await owner.client.from("invites").insert({ organization_id: org, created_by: owner.id }).select("token").single();
    const rejoin = await player.client.rpc("accept_invite", { invite_token: invite!.token, member_display_name: "Player again" });
    expect(rejoin.error?.hint).toBe("deactivated");
    const move = await owner.client.rpc("set_member_team", { target: player.id, new_team: firstTeam });
    expect(move.error?.hint).toBe("deactivated");
  });

  it("reactivating restores access", async () => {
    expect((await owner.client.rpc("set_member_active", { target: player.id, active: true })).error).toBeNull();
    expect((await player.client.from("organizations").select("id")).data).toEqual([{ id: org }]);
  });

  it("hands ownership to an active admin only, leaving exactly one owner", async () => {
    const toPlayer = await owner.client.rpc("transfer_ownership", { new_owner: player.id });
    expect(toPlayer.error?.hint).toBe("not_admin");
    const byAdmin = await manager.client.rpc("transfer_ownership", { new_owner: manager.id });
    expect(byAdmin.error?.hint).toBe("not_authorized");

    expect((await owner.client.rpc("transfer_ownership", { new_owner: manager.id })).error).toBeNull();
    expect(await roleOf(manager)).toBe("owner");
    expect(await roleOf(owner)).toBe("admin");
    const { count } = await admin.from("memberships").select("*", { count: "exact", head: true }).eq("organization_id", org).eq("role", "owner");
    expect(count).toBe(1);

    const formerOwner = await owner.client.rpc("set_member_role", { target: player.id, new_role: "admin" });
    expect(formerOwner.error?.hint).toBe("not_authorized");
  });
});
