import { spawnSync } from "node:child_process";

/** Every run starts from the same seeded world. */
export default function globalSetup() {
  const r = spawnSync("node", ["scripts/db.mts", "reset"], { stdio: "inherit", env: process.env });
  if (r.status !== 0) throw new Error("database reset failed");
}
