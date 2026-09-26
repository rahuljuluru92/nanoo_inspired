import { spawnSync } from "node:child_process";

/** After a run against a live site, remove what the tests created so the public roster and demo data are exactly as they were. */
export default function globalTeardown() {
  if (!process.env.E2E_BASE_URL) return;
  const r = spawnSync("node", ["scripts/db.mts", "cleanup-e2e"], { stdio: "inherit", env: process.env });
  if (r.status !== 0) console.error("WARNING: cleanup failed; run `npm run db:cleanup-e2e` against the live database.");
}
