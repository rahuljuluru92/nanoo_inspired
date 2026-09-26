// Database tooling. Portable: works against any Postgres 15+ given DATABASE_URL (default: the project-local cluster).
//   node scripts/db.mts migrate | seed | reset | test
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import pg from "pg";
import { DEMO_BRAND_EMAIL, DEMO_CREATOR_EMAIL, DEMO_PASSWORD } from "../src/lib/demo.ts";
import { hashPassword } from "../src/lib/password.ts";

const root = resolve(import.meta.dirname, "..");
const LOCAL = "postgres://postgres@127.0.0.1:54322/byline";
const url = process.env.DATABASE_URL ?? LOCAL;
const sqlFiles = (dir: string) => readdirSync(join(root, dir)).filter((f) => f.endsWith(".sql")).sort();
const read = (dir: string, f: string) => readFileSync(join(root, dir, f), "utf8");

async function withClient<T>(connectionString: string, fn: (c: pg.Client) => Promise<T>): Promise<T> {
  const c = new pg.Client({ connectionString });
  await c.connect();
  try {
    return await fn(c);
  } finally {
    await c.end();
  }
}

async function migrate(c: pg.Client): Promise<string[]> {
  await c.query("create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())");
  const done = new Set((await c.query<{ name: string }>("select name from schema_migrations")).rows.map((r) => r.name));
  const applied: string[] = [];
  for (const f of sqlFiles("db/migrations")) {
    if (done.has(f)) continue;
    await c.query("begin");
    try {
      await c.query(read("db/migrations", f));
      await c.query("insert into schema_migrations (name) values ($1)", [f]);
      await c.query("commit");
      applied.push(f);
    } catch (e) {
      await c.query("rollback");
      throw new Error(`migration ${f} failed: ${(e as Error).message}`);
    }
  }
  return applied;
}

async function seed(c: pg.Client): Promise<void> {
  for (const f of sqlFiles("db/seed")) await c.query(read("db/seed", f));
  const hash = await hashPassword(DEMO_PASSWORD);
  const ensure = async (email: string, role: string, name: string, company: string | null, demo: boolean, pw = hash) => {
    const found = await c.query<{ id: string }>("select id from accounts where email = $1", [email]);
    if (found.rows[0]) return found.rows[0].id;
    const r = await c.query<{ id: string }>("select create_account($1,$2,$3,$4,$5,$6) as id", [email, pw, role, name, company, demo]);
    return r.rows[0]!.id;
  };
  await ensure(DEMO_BRAND_EMAIL, "brand", "Demo Brand", "Halcyon Security", true);
  const unusable = "scrypt$0$x$x"; // seeded non-demo owners cannot sign in
  await ensure("ops@northwind.example", "brand", "Northwind Ops", "Northwind Data", false, unusable);
  await ensure("ops@parallax.example", "brand", "Parallax Ops", "Parallax People", false, unusable);
  const creatorAccount = await ensure(DEMO_CREATOR_EMAIL, "creator", "Maya Okafor", null, true);
  await c.query("update creators set account_id = $1, is_sandbox = false, verified = true where handle = 'maya-okafor'", [creatorAccount]);
  await c.query("select app.seed_demo_state()");
}

async function reset(): Promise<void> {
  if (!/(localhost|127\.0\.0\.1)/.test(url) && !process.argv.includes("--force")) throw new Error("refusing to reset a non-local database without --force");
  await withClient(url, async (c) => {
    await c.query("drop schema if exists public cascade; drop schema if exists app cascade; create schema public;");
    await c.query("grant usage on schema public to public");
  });
}

async function runTests(): Promise<void> {
  const admin = new URL(url);
  const testDb = "byline_test";
  const testUrl = (() => { const u = new URL(url); u.pathname = `/${testDb}`; return u.toString(); })();
  await withClient(admin.toString().replace(/\/[^/]*$/, "/postgres"), async (c) => {
    await c.query(`drop database if exists ${testDb} with (force)`);
    await c.query(`create database ${testDb}`);
  });
  let failed = 0;
  try {
    await withClient(testUrl, async (c) => {
      const applied = await migrate(c);
      console.log(`migrated ${applied.length} files into ${testDb}`);
      const prelude = read("db/tests", "_prelude.sql");
      for (const f of sqlFiles("db/tests").filter((n) => !n.startsWith("_"))) {
        const started = Date.now();
        try {
          await c.query("begin");
          await c.query(prelude + "\n" + read("db/tests", f));
          await c.query("rollback");
          console.log(`  ok   ${f} (${Date.now() - started} ms)`);
        } catch (e) {
          await c.query("rollback").catch(() => {});
          failed++;
          console.log(`  FAIL ${f}\n       ${(e as Error).message}`);
        }
      }
    });
  } finally {
    await withClient(admin.toString().replace(/\/[^/]*$/, "/postgres"), (c) => c.query(`drop database if exists ${testDb} with (force)`));
  }
  if (failed) process.exit(1);
  console.log("all database tests passed");
}

const cmd = process.argv[2];
if (cmd === "migrate") console.log("applied:", (await withClient(url, migrate)).join(", ") || "nothing (up to date)");
else if (cmd === "seed") { await withClient(url, seed); console.log("seeded"); }
else if (cmd === "reset") {
  await reset();
  console.log("applied:", (await withClient(url, migrate)).length, "migrations");
  await withClient(url, seed);
  console.log("seeded");
} else if (cmd === "test") await runTests();
else { console.log("usage: node scripts/db.mts migrate|seed|reset|test"); process.exit(2); }
