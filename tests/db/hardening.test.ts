import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, cleanup, createCompany, createTestUser, joinCompany, type TestUser } from "./helpers";

describe("hardening", () => {
  let owner: TestUser;
  let player: TestUser;
  let first: TestUser;
  let second: TestUser;
  let org: string;

  beforeAll(async () => {
    [owner, player, first, second] = await Promise.all([
      createTestUser("hard-owner"),
      createTestUser("hard-player"),
      createTestUser("hard-first"),
      createTestUser("hard-second"),
    ]);
    org = await createCompany(owner, "Hardening Co");
    await joinCompany(owner, player, org, "Player");
  }, 120_000);

  afterAll(async () => {
    await cleanup([owner, player, first, second].filter(Boolean), [org].filter(Boolean));
  });

  it("counts rate-limit hits for the server only", async () => {
    const key = `test:${crypto.randomUUID()}`;
    const hit = () => admin.rpc("hit_rate_limit", { p_key: key, p_limit: 2, p_window_seconds: 600 });
    expect((await hit()).data).toBe(true);
    expect((await hit()).data).toBe(true);
    expect((await hit()).data).toBe(false);

    expect((await owner.client.rpc("hit_rate_limit", { p_key: key, p_limit: 99, p_window_seconds: 600 })).error).not.toBeNull();
  });

  it("stops an invite link once it is full, without counting existing members", async () => {
    const { data: invite } = await owner.client.from("invites").insert({ organization_id: org, created_by: owner.id }).select("token, max_uses").single();
    expect(invite?.max_uses).toBe(25);
    // Clients can't choose the cap; shrink it with the service role to test the limit.
    expect((await owner.client.from("invites").update({ max_uses: 1 }).eq("token", invite!.token)).error).not.toBeNull();
    await admin.from("invites").update({ max_uses: 1 }).eq("token", invite!.token);

    expect((await first.client.rpc("accept_invite", { invite_token: invite!.token, member_display_name: "First" })).error).toBeNull();
    expect((await first.client.rpc("accept_invite", { invite_token: invite!.token, member_display_name: "First" })).error).toBeNull();
    const full = await second.client.rpc("accept_invite", { invite_token: invite!.token, member_display_name: "Second" });
    expect(full.error?.hint).toBe("invite_full");
    expect((await admin.from("invites").select("uses").eq("token", invite!.token).single()).data?.uses).toBe(1);
  });

  it("allows at most 10 active invite links per company", async () => {
    await admin.from("invites").delete().eq("organization_id", org);
    for (let i = 0; i < 10; i++) {
      const { error } = await owner.client.from("invites").insert({ organization_id: org, created_by: owner.id });
      expect(error).toBeNull();
    }
    const eleventh = await owner.client.from("invites").insert({ organization_id: org, created_by: owner.id });
    expect(eleventh.error?.hint).toBe("too_many_invites");
  });

  it("logs record downloads for owners and admins to read, and nobody else to write", async () => {
    const { error } = await admin
      .from("record_exports")
      .insert({ organization_id: org, user_id: owner.id, format: "pdf", period_from: "2026-10-01", period_to: "2026-10-28" });
    expect(error).toBeNull();

    expect((await owner.client.from("record_exports").select("format")).data).toEqual([{ format: "pdf" }]);
    expect((await player.client.from("record_exports").select("format")).data).toEqual([]);
    const forged = await owner.client
      .from("record_exports")
      .insert({ organization_id: org, user_id: owner.id, format: "csv", period_from: "2026-10-01", period_to: "2026-10-28" });
    expect(forged.error).not.toBeNull();
    expect((await owner.client.from("record_exports").delete().eq("organization_id", org).select("id")).data ?? []).toEqual([]);
  });
});
