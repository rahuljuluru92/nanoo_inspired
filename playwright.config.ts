import { defineConfig, devices } from "@playwright/test";

const PORT = 3200;
const DB = process.env.DATABASE_URL ?? "postgres://postgres@127.0.0.1:54322/byline";
/** E2E_BASE_URL points the whole suite at a deployed site instead of a local production build (needs DATABASE_URL of that site's database). */
const LIVE = process.env.E2E_BASE_URL?.replace(/\/+$/, "");

/**
 * End-to-end tests run against the PRODUCTION build (`next start`) and a real, freshly seeded Postgres.
 *   npm run e2e                                   # against a local production build (build first) and a local database
 *   E2E_BASE_URL=https://… DATABASE_URL=… npm run e2e   # against the live site; restores the demo world before, cleans up after
 * Specs are numbered because they share one database and run serially: read-only checks first, the mutating golden loop after.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 90_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  use: { baseURL: LIVE ?? `http://localhost:${PORT}`, trace: "retain-on-failure", screenshot: "only-on-failure" },
  webServer: LIVE
    ? undefined
    : {
        command: `node node_modules/next/dist/bin/next start -p ${PORT}`,
        // Not /api/health: Playwright starts this server BEFORE globalSetup migrates the database, and health is 503 on an empty one (CI).
        url: `http://localhost:${PORT}/login`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: { DATABASE_URL: DB, CLICK_HASH_SECRET: "e2e-secret", NEXT_PUBLIC_SITE_URL: `http://localhost:${PORT}` },
      },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    { name: "chromium", use: { ...devices["Desktop Chrome"] }, dependencies: ["setup"], testMatch: /\/[0-9]-.*\.spec\.ts/ },
    { name: "webkit-iphone", use: { ...devices["iPhone 15"] }, dependencies: ["chromium"], testMatch: /webkit-.*\.spec\.ts/ },
  ],
});
