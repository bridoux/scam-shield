import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["src/**/*.test.ts", "tests/*.test.ts"],
        },
      },
      {
        // Integration tests against the test Supabase project in .env.test.local (it overrides .env.local).
        // They create and delete their own users; tests/db/setup.ts refuses to run against production.
        extends: true,
        test: {
          name: "db",
          environment: "node",
          include: ["tests/db/**/*.test.ts"],
          setupFiles: ["tests/db/setup.ts"],
          env: loadEnv("test", process.cwd(), ""),
          // Every call crosses the network to the hosted project, so allow for latency.
          testTimeout: 90_000,
          hookTimeout: 60_000,
          fileParallelism: false,
        },
      },
    ],
  },
});
