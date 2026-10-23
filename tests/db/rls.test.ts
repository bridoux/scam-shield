import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startRound } from "@/lib/play/core";
import { admin, anonClient, cleanup, createCompany, createTestUser, type TestUser } from "./helpers";

/** Two users, two companies: nothing of company B may be read or written by A (and vice versa). */
describe("row level security isolates companies", () => {
  let a: TestUser;
  let b: TestUser;
  let orgA: string;
  let orgB: string;
  let teamB: string;
  let inviteB: string;
  let roundB: string;

  beforeAll(async () => {
    [a, b] = await Promise.all([createTestUser("a"), createTestUser("b")]);
    [orgA, orgB] = await Promise.all([createCompany(a, "Company A"), createCompany(b, "Company B")]);

    const { data: team } = await admin.from("teams").select("id").eq("organization_id", orgB).single();
    teamB = team!.id;
    const { data: invite, error } = await b.client
      .from("invites")
      .insert({ organization_id: orgB, team_id: teamB, created_by: b.id })
      .select("token")
      .single();
    if (error) throw error;
    inviteB = invite.token;
    roundB = (await startRound(admin, b.id)).roundId;
  });

  afterAll(async () => {
    await cleanup([a, b].filter(Boolean), [orgA, orgB].filter(Boolean));
  });

  it("lets each member see only their own company, teams and memberships", async () => {
    const { data: orgs } = await a.client.from("organizations").select("id");
    expect(orgs?.map((o) => o.id)).toEqual([orgA]);

    const { data: teams } = await a.client.from("teams").select("organization_id");
    expect(new Set(teams?.map((t) => t.organization_id))).toEqual(new Set([orgA]));

    const { data: members } = await a.client.from("memberships").select("user_id, organization_id");
    expect(members).toEqual([{ user_id: a.id, organization_id: orgA }]);

    const { data: direct } = await a.client.from("organizations").select("id").eq("id", orgB);
    expect(direct).toEqual([]);
  });

  it("hides the other company's invites and rounds", async () => {
    const { data: invites } = await a.client.from("invites").select("token").eq("token", inviteB);
    expect(invites).toEqual([]);

    const { data: rounds } = await a.client.from("rounds").select("id").eq("id", roundB);
    expect(rounds).toEqual([]);

    const { data: answers } = await a.client.from("round_answers").select("round_id").eq("round_id", roundB);
    expect(answers).toEqual([]);
  });

  it("blocks writes into the other company", async () => {
    const rename = await a.client.from("organizations").update({ name: "Hacked" }).eq("id", orgB).select("id");
    expect(rename.data ?? []).toEqual([]);
    const { data: stillB } = await admin.from("organizations").select("name").eq("id", orgB).single();
    expect(stillB?.name).toBe("Company B");

    const team = await a.client.from("teams").insert({ organization_id: orgB, name: "Intruders" });
    expect(team.error).not.toBeNull();

    const invite = await a.client.from("invites").insert({ organization_id: orgB, created_by: a.id });
    expect(invite.error).not.toBeNull();

    const removeInvite = await a.client.from("invites").delete().eq("token", inviteB).select("token");
    expect(removeInvite.data ?? []).toEqual([]);
    const { data: inviteStill } = await admin.from("invites").select("token").eq("token", inviteB);
    expect(inviteStill).toHaveLength(1);

    const membership = await a.client
      .from("memberships")
      .insert({ user_id: a.id, organization_id: orgB, role: "owner", display_name: "Sneaky" });
    expect(membership.error).not.toBeNull();
  });

  it("lets an owner rename their company but not change its time zone, or forge invite terms", async () => {
    const rename = await a.client.from("organizations").update({ name: "Company A Renamed" }).eq("id", orgA).select("name");
    expect(rename.error).toBeNull();
    expect(rename.data).toEqual([{ name: "Company A Renamed" }]);

    const zone = await a.client.from("organizations").update({ time_zone: "Pacific/Kiritimati" }).eq("id", orgA);
    expect(zone.error).not.toBeNull();

    for (const forged of [
      { role: "admin" },
      { token: "a".repeat(64) },
      { expires_at: "2099-01-01T00:00:00Z" },
    ]) {
      const invite = await a.client.from("invites").insert({ organization_id: orgA, created_by: a.id, ...forged });
      expect(invite.error, JSON.stringify(forged)).not.toBeNull();
    }
    const plain = await a.client.from("invites").insert({ organization_id: orgA, created_by: a.id }).select("token, role");
    expect(plain.error).toBeNull();
    expect(plain.data?.[0].role).toBe("player");
    expect(plain.data?.[0].token).toMatch(/^[0-9a-f]{64}$/);
  });

  it("does not let players write rounds or answers directly, even their own", async () => {
    const round = await a.client
      .from("rounds")
      .insert({ user_id: a.id, organization_id: orgA, round_date: "2026-01-01", card_count: 10, points: 9999 });
    expect(round.error).not.toBeNull();

    const forge = await b.client.from("rounds").update({ points: 9999 }).eq("id", roundB).select("id");
    expect(forge.data ?? []).toEqual([]);

    const answer = await b.client
      .from("round_answers")
      .update({ answer: "scam", is_correct: true, answered_at: new Date().toISOString() })
      .eq("round_id", roundB)
      .select("position");
    expect(answer.data ?? []).toEqual([]);
  });

  it("keeps scenarios (and their verdicts) away from every client", async () => {
    const asMember = await a.client.from("scenarios").select("id, verdict").limit(1);
    expect(asMember.data ?? []).toEqual([]);
    expect(asMember.error).not.toBeNull();

    const asAnon = await anonClient().from("scenarios").select("id, verdict").limit(1);
    expect(asAnon.data ?? []).toEqual([]);
  });

  it("gives signed-out visitors nothing", async () => {
    const anon = anonClient();
    for (const table of ["organizations", "teams", "memberships", "invites", "rounds", "round_answers"] as const) {
      const { data } = await anon.from(table).select("*").limit(1);
      expect(data ?? [], table).toEqual([]);
    }
    const rpc = await anon.rpc("accept_invite", { invite_token: inviteB, member_display_name: "Anon" });
    expect(rpc.error).not.toBeNull();
  });

  it("refuses an invite into a second company", async () => {
    const { error } = await a.client.rpc("accept_invite", { invite_token: inviteB, member_display_name: "A" });
    expect(error?.hint).toBe("already_member");
    const { data } = await admin.from("memberships").select("organization_id").eq("user_id", a.id);
    expect(data).toEqual([{ organization_id: orgA }]);
  });
});
