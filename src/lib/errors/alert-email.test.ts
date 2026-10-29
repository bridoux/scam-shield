import { describe, expect, it } from "vitest";
import { alertConfig, composeAlert, type AlertDetails } from "./alert-email";

const details: AlertDetails = {
  environment: "production",
  source: "server",
  scope: "action /team",
  message: "PostgrestError: permission denied for table invites",
  route: "/team",
  isNew: true,
  sinceAlert: 1,
  firstSeen: "2026-10-29T10:00:00+00:00",
  at: new Date("2026-10-29T10:00:05Z"),
  deployment: "scam-shield-abc.vercel.app · 1a2b3c4",
};

describe("composeAlert", () => {
  it("names a new error, where it happened and when", () => {
    const email = composeAlert(details);
    expect(email.subject).toBe("[Scam Shield] New error · action /team");
    expect(email.text).toContain("PostgrestError: permission denied for table invites");
    expect(email.text).toContain("Where: server · action /team");
    expect(email.text).toContain("Page: /team");
    expect(email.text).toContain("When: 2026-10-29 10:00:05 UTC");
    expect(email.text).toContain("Deployment: scam-shield-abc.vercel.app · 1a2b3c4");
    expect(email.text).not.toContain("First seen");
  });

  it("says how many times a repeating error happened since the last email", () => {
    const email = composeAlert({ ...details, isNew: false, sinceAlert: 37 });
    expect(email.subject).toBe("[Scam Shield] 37× since the last alert · action /team");
    expect(email.text).toContain("First seen: 2026-10-29 10:00:00 UTC");
  });

  it("marks browser reports as unverified, above their text", () => {
    const email = composeAlert({ ...details, source: "browser", scope: "browser.error" });
    expect(email.text.startsWith("UNVERIFIED: this report was sent by a visitor's browser.")).toBe(true);
    expect(composeAlert(details).text).not.toContain("UNVERIFIED");
  });

  it("says so when the count is unknown, and marks other environments", () => {
    const email = composeAlert({ ...details, environment: "preview", isNew: false, sinceAlert: null });
    expect(email.subject).toBe("[Scam Shield] [preview] Error again · action /team");
    expect(email.text).toContain("Count: unknown");
  });
});

describe("alertConfig", () => {
  const production: NodeJS.ProcessEnv = { NODE_ENV: "production", VERCEL_ENV: "production", RESEND_API_KEY: "re_test", ALERT_EMAIL_TO: "ops@scam-shield.example" };

  it("sends from production once the key and address are set", () => {
    expect(alertConfig(production)).toEqual({ apiKey: "re_test", to: "ops@scam-shield.example", from: "Scam Shield alerts <onboarding@resend.dev>" });
    expect(alertConfig({ ...production, ALERT_EMAIL_FROM: "Alerts <alerts@scam-shield.example>" })?.from).toBe("Alerts <alerts@scam-shield.example>");
  });

  it("stays silent in other environments or without settings", () => {
    expect(alertConfig({ ...production, VERCEL_ENV: "preview" })).toBeNull();
    expect(alertConfig({ ...production, RESEND_API_KEY: " " })).toBeNull();
    expect(alertConfig({ ...production, ALERT_EMAIL_TO: undefined })).toBeNull();
  });
});
