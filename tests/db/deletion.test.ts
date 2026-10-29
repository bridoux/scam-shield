import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, cleanup, createCompany, createTestUser, joinCompany, playRound, type TestUser } from "./helpers";

async function count(table: "memberships" | "rounds" | "teams" | "invites", column: string, value: string) {
  const { count: n, error } = await admin.from(table).select("*", { count: "exact", head: true }).eq(column, value);
  if (error) throw error;
  return n;
}

describe("deleting a company", () => {
  let owner: TestUser;
  let manager: TestUser;
  let player: TestUser;
  let org: string;

  beforeAll(async () => {
    [owner, manager, player] = await Promise.all([createTestUser("del-owner"), createTestUser("del-admin"), createTestUser("del-player")]);
    org = await createCompany(owner, "Deletion Co");
    await joinCompany(owner, manager, org, "Admin");
    await joinCompany(owner, player, org, "Player");
    const promoted = await owner.client.rpc("set_member_role", { target: manager.id, new_role: "admin" });
    if (promoted.error) throw promoted.error;
    await playRound(player.id, new Date());
  }, 180_000);

  afterAll(async () => {
    await cleanup([owner, manager, player].filter(Boolean), [org].filter(Boolean));
  });

  it("is refused for players, admins and a wrong name", async () => {
    expect((await player.client.rpc("delete_organization", { confirm_name: "Deletion Co" })).error?.hint).toBe("not_authorized");
    expect((await manager.client.rpc("delete_organization", { confirm_name: "Deletion Co" })).error?.hint).toBe("not_authorized");
    expect((await owner.client.rpc("delete_organization", { confirm_name: "Deletion Company" })).error?.hint).toBe("name_mismatch");
    expect(await count("memberships", "organization_id", org)).toBe(3);
  });

  it("erases the company and its training data, but keeps everyone's sign-in", async () => {
    expect((await owner.client.rpc("delete_organization", { confirm_name: "  Deletion Co " })).error).toBeNull();

    expect((await admin.from("organizations").select("id").eq("id", org)).data).toEqual([]);
    expect(await count("memberships", "organization_id", org)).toBe(0);
    expect(await count("teams", "organization_id", org)).toBe(0);
    expect(await count("rounds", "organization_id", org)).toBe(0);
    expect(await count("invites", "organization_id", org)).toBe(0);

    for (const user of [owner, manager, player]) {
      const { data, error } = await admin.auth.admin.getUserById(user.id);
      expect(error).toBeNull();
      expect(data.user?.id).toBe(user.id);
    }
  });
});

describe("deleting an account", () => {
  let owner: TestUser;
  let player: TestUser;
  let org: string;

  beforeAll(async () => {
    [owner, player] = await Promise.all([createTestUser("acct-owner"), createTestUser("acct-player")]);
    org = await createCompany(owner, "Account Co");
    await joinCompany(owner, player, org, "Leaving Player");
    await playRound(player.id, new Date());
  }, 180_000);

  afterAll(async () => {
    await cleanup([owner].filter(Boolean), [org].filter(Boolean));
  });

  it("erases the person's membership and every round, and leaves the company alone", async () => {
    expect(await count("rounds", "user_id", player.id)).toBeGreaterThan(0);
    // The same call the account page's server action makes.
    expect((await admin.auth.admin.deleteUser(player.id)).error).toBeNull();

    expect(await count("memberships", "user_id", player.id)).toBe(0);
    expect(await count("rounds", "user_id", player.id)).toBe(0);
    expect(await count("memberships", "organization_id", org)).toBe(1);
    const { data } = await owner.client.rpc("training_report", { p_from: "2026-01-01", p_to: "2026-12-31" });
    expect((data ?? []).map((r) => r.display_name)).not.toContain("Leaving Player");
  });
});
