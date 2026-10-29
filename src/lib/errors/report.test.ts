import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ after: () => { throw new Error("outside a request"); } }));

const rpc = vi.fn();
vi.mock("../supabase/admin", () => ({ createAdminClient: () => ({ rpc }) }));

const { fingerprintOf, reportError, shouldAlertWithoutLog } = await import("./report");

function logged(row: { should_alert: boolean; is_new: boolean; since_alert: number }) {
  return { single: async () => ({ data: { ...row, occurrences: row.since_alert, first_seen: "2026-10-29T10:00:00+00:00" }, error: null }) };
}

describe("fingerprintOf", () => {
  it("groups by environment, source, scope and message without numbers", () => {
    const a = fingerprintOf("production", "server", "render /dashboard", "Timeout after 10012 ms");
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(fingerprintOf("production", "server", "render /dashboard", "Timeout after 9001 ms")).toBe(a);
    expect(fingerprintOf("preview", "server", "render /dashboard", "Timeout after 10012 ms")).not.toBe(a);
    expect(fingerprintOf("production", "server", "render /team", "Timeout after 10012 ms")).not.toBe(a);
  });
});

describe("shouldAlertWithoutLog", () => {
  const fresh = () => ({ byFingerprint: new Map<string, number>(), sentAt: [] as number[] });

  it("emails a kind of error at most once an hour per instance", () => {
    const state = fresh();
    expect(shouldAlertWithoutLog("f", 0, state)).toBe(true);
    expect(shouldAlertWithoutLog("f", 59 * 60_000, state)).toBe(false);
    expect(shouldAlertWithoutLog("other", 59 * 60_000, state)).toBe(true);
    expect(shouldAlertWithoutLog("f", 61 * 60_000, state)).toBe(true);
  });

  it("sends at most 10 emails an hour in all, however many kinds of error", () => {
    const state = fresh();
    const sent = Array.from({ length: 25 }, (_, i) => shouldAlertWithoutLog(`kind-${i}`, i * 1000, state));
    expect(sent.filter(Boolean)).toHaveLength(10);
    expect(shouldAlertWithoutLog("later", 2 * 60 * 60_000, state)).toBe(true);
  });
});

describe("reportError", () => {
  const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("ALERT_EMAIL_TO", "ops@scam-shield.example");
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    rpc.mockReset();
    fetchMock.mockClear();
  });

  it("logs a scrubbed message and emails when the log says so", async () => {
    rpc.mockReturnValue(logged({ should_alert: true, is_new: true, since_alert: 1 }));
    await reportError({ source: "server", scope: "auth.signInWithOtp", error: new Error("failed for dana@dealer.example"), route: "/sign-in?next=/team" });

    const [name, args] = rpc.mock.calls[0]!;
    expect(name).toBe("record_error");
    expect(args).toMatchObject({ p_environment: "production", p_source: "server", p_scope: "auth.signInWithOtp", p_message: "Error: failed for [email]", p_route: "/sign-in" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    const body = JSON.parse(String(init.body));
    expect(body.to).toEqual(["ops@scam-shield.example"]);
    expect(body.subject).toBe("[Scam Shield] New error · auth.signInWithOtp");
    expect(body.text).not.toContain("dana");
  });

  it("gives browser reports a small budget of their own and strips their links", async () => {
    rpc.mockReturnValue(logged({ should_alert: true, is_new: true, since_alert: 1 }));
    await reportError({ source: "browser", scope: "browser.error", error: "Rotate your key at https://evil.example/login", route: "/play" });
    expect(rpc.mock.calls[0]![1]).toMatchObject({ p_source: "browser", p_daily_alerts: 5, p_message: "Rotate your key at [link]" });
    const body = JSON.parse(String((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(body.text).toContain("UNVERIFIED");
    expect(body.text).not.toContain("evil.example");
  });

  it("stays quiet when the log says the error was emailed within the hour", async () => {
    rpc.mockReturnValue(logged({ should_alert: false, is_new: false, since_alert: 4 }));
    await reportError({ source: "server", scope: "quiet", error: "again" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("logs but never emails outside production", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    rpc.mockReturnValue(logged({ should_alert: true, is_new: true, since_alert: 1 }));
    await reportError({ source: "server", scope: "preview-only", error: "x" });
    expect(rpc).toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("still emails, at most hourly, when the error log is unreachable", async () => {
    rpc.mockReturnValue({ single: async () => ({ data: null, error: { message: "fetch failed" } }) });
    await reportError({ source: "health", scope: "health.database", error: "down" });
    await reportError({ source: "health", scope: "health.database", error: "down" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body)).text).toContain("Count: unknown");
  });

  it("never throws, and frees the hourly slot when the email fails", async () => {
    rpc.mockImplementation((name: string) => (name === "record_error" ? logged({ should_alert: true, is_new: true, since_alert: 1 }) : Promise.resolve({ error: null })));
    fetchMock.mockResolvedValueOnce(new Response("no", { status: 500 }));
    await expect(reportError({ source: "server", scope: "resend-down", error: "x" })).resolves.toBeUndefined();
    expect(rpc.mock.calls.map(([name]) => name)).toEqual(["record_error", "release_error_alert"]);
    expect(rpc.mock.calls[1]![1]).toEqual({ p_fingerprint: rpc.mock.calls[0]![1].p_fingerprint });
    rpc.mockImplementation(() => { throw new Error("client exploded"); });
    await expect(reportError({ source: "server", scope: "client-down", error: "x" })).resolves.toBeUndefined();
  });
});
