import { expect, test } from "@playwright/test";

test("the health endpoint reports the site and database as ok", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect(await response.json()).toEqual({ status: "ok" });
});

test("browser crash reports are accepted from the site only, and only well-formed", async ({ request }) => {
  const report = { kind: "error", message: "TypeError: e2e check", path: "/play?x=1" };
  const ok = await request.post("/api/client-error", { data: report, headers: { "Sec-Fetch-Site": "same-origin" } });
  expect(ok.status()).toBe(204);

  const crossSite = await request.post("/api/client-error", { data: report, headers: { "Sec-Fetch-Site": "cross-site" } });
  expect(crossSite.status()).toBe(403);
  // Browsers that don't send Sec-Fetch-Site are judged by their Origin.
  const otherOrigin = await request.post("/api/client-error", { data: report, headers: { Origin: "https://evil.example" } });
  expect(otherOrigin.status()).toBe(403);

  const malformed = await request.post("/api/client-error", { data: { kind: "other", message: "x", path: "/" } });
  expect(malformed.status()).toBe(400);

  // Dropped connections are noise: accepted, but not logged.
  const noise = await request.post("/api/client-error", { data: { ...report, message: "TypeError: Failed to fetch" } });
  expect(noise.status()).toBe(204);

  expect((await request.get("/api/client-error")).status()).toBe(405);
});
