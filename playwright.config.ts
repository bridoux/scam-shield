import { loadEnvConfig } from "@next/env";
import { defineConfig, devices } from "@playwright/test";

// Signed-in tests use the Supabase project in .env.local to create and remove their own users.
loadEnvConfig(process.cwd());

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
