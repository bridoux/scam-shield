import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";
import { assertTestDatabase } from "./tests/guard";

// Signed-in tests create and remove their own users, so both they and the app server under test use the
// test Supabase project in .env.test.local. Values set here win over .env.local when Next builds the app.
if (existsSync(".env.test.local")) process.loadEnvFile(".env.test.local");
assertTestDatabase();

const PORT = 3100;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  timeout: 90_000,
  // Every answer is a real server round trip (to Supabase in signed-in play), so allow for network latency.
  expect: { timeout: 15_000 },
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  // PLAYWRIGHT_CHANNEL lets a machine use an installed browser instead, e.g. "msedge" or "chrome".
  projects: [{ name: "mobile", use: { ...devices["Pixel 7"], channel: process.env.PLAYWRIGHT_CHANNEL || undefined } }],
  webServer: {
    command: `npm run build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
