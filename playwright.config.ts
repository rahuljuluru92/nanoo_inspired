import { defineConfig, devices } from "@playwright/test";

const PORT = 3200;
const DB = process.env.DATABASE_URL ?? "postgres://postgres@127.0.0.1:54322/byline";

/**
 * End-to-end tests run against the PRODUCTION build (`next start`) and a real, freshly seeded Postgres.
 *   npm run e2e:prod     # build, reset + seed the database, run everything
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
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure", screenshot: "only-on-failure" },
  webServer: {
    command: `node node_modules/next/dist/bin/next start -p ${PORT}`,
    url: `http://localhost:${PORT}/api/health`,
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
