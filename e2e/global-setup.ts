import { spawnSync } from "node:child_process";

const db = (...args: string[]) => {
  const r = spawnSync("node", ["scripts/db.mts", ...args], { stdio: "inherit", env: process.env });
  if (r.status !== 0) throw new Error(`database step failed: ${args.join(" ")}`);
};

/** Every run starts from the same seeded world: rebuilt from scratch locally, or the demo data restored on a live database. */
export default function globalSetup() {
  if (process.env.E2E_BASE_URL) {
    if (!process.env.DATABASE_URL) throw new Error("E2E_BASE_URL needs DATABASE_URL too: the tests read the site's own database to find ids and to audit the ledger.");
    db("cleanup-e2e"); // leftovers from an earlier run, then the demo world
  } else db("reset");
}
