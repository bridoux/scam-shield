import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, anonClient, cleanup, createTestUser, type TestUser } from "./helpers";

// Fingerprints are random per run; the rows expire from private.error_events after 30 days.
function record(fingerprint: string, budget = 1000, environment = "test", source: "server" | "browser" = "server") {
  return admin
    .rpc("record_error", {
      p_fingerprint: fingerprint,
      p_environment: environment,
      p_source: source,
      p_scope: "db-test",
      p_message: "Error: db test",
      p_route: "/db-test",
      p_daily_alerts: budget,
    })
    .single();
}

describe("error alerts", () => {
  let user: TestUser;

  beforeAll(async () => {
    user = await createTestUser("errors");
  }, 60_000);

  afterAll(async () => {
    await cleanup([user].filter(Boolean), []);
  });

  it("emails the first occurrence, then counts repeats quietly within the hour", async () => {
    const fingerprint = `db-test-${crypto.randomUUID()}`;
    const first = await record(fingerprint);
    expect(first.error).toBeNull();
    expect(first.data).toMatchObject({ should_alert: true, is_new: true, occurrences: 1, since_alert: 1 });

    const second = await record(fingerprint);
    expect(second.data).toMatchObject({ should_alert: false, is_new: false, occurrences: 2, since_alert: 1 });
    const third = await record(fingerprint);
    expect(third.data).toMatchObject({ should_alert: false, occurrences: 3, since_alert: 2 });
  });

  it("stops emailing once the environment's daily budget is spent", async () => {
    // A throwaway environment name gives this test its own budget counter.
    const environment = `t${crypto.randomUUID().slice(0, 8)}`;
    expect((await record(`db-test-${crypto.randomUUID()}`, 1, environment)).data?.should_alert).toBe(true);
    const overBudget = await record(`db-test-${crypto.randomUUID()}`, 1, environment);
    expect(overBudget.data).toMatchObject({ should_alert: false, is_new: true });
    // Browser reports have their own budget, so they can't use up the server's (or the reverse).
    expect((await record(`db-test-${crypto.randomUUID()}`, 1, environment, "browser")).data?.should_alert).toBe(true);
  });

  it("lets the next occurrence email again when the last email couldn't be sent", async () => {
    const fingerprint = `db-test-${crypto.randomUUID()}`;
    expect((await record(fingerprint)).data?.should_alert).toBe(true);
    expect((await record(fingerprint)).data?.should_alert).toBe(false);
    expect((await admin.rpc("release_error_alert", { p_fingerprint: fingerprint })).error).toBeNull();
    expect((await record(fingerprint)).data?.should_alert).toBe(true);
    expect((await user.client.rpc("release_error_alert", { p_fingerprint: fingerprint })).error).not.toBeNull();
  });

  it("is callable by server code only", async () => {
    const args = { p_fingerprint: "x", p_environment: "test", p_source: "server", p_scope: "x", p_message: "x", p_route: "/", p_daily_alerts: 1 };
    expect((await user.client.rpc("record_error", args)).error).not.toBeNull();
    expect((await anonClient().rpc("record_error", args)).error).not.toBeNull();
  });
});
