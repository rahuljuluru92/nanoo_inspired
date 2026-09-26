// Database tooling. Portable: works against any Postgres 15+ given DATABASE_URL (default: the project-local cluster).
//   node scripts/db.mts check | migrate | seed | reset-demo | reset | test
//   check       connects, prints what it finds, and says whether this database can host Byline (run it first against a hosted URL)
//   reset-demo  puts the three demo brands, Maya's account and their campaigns back to the starting state (safe on a live database)
//   cleanup-e2e [email]  removes every account the end-to-end tests created (@example.test), plus one exact email if given, and restores the demo world
//   reset       drops everything and rebuilds; refuses non-local databases without --force
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import pg from "pg";
import { DEMO_BRAND_EMAIL, DEMO_CREATOR_EMAIL, DEMO_PASSWORD } from "../src/lib/demo.ts";
import { hashPassword } from "../src/lib/password.ts";

const root = resolve(import.meta.dirname, "..");
const LOCAL = "postgres://postgres@127.0.0.1:54322/byline";
const url = process.env.DATABASE_URL ?? LOCAL;
const isLocal = (u: string) => /(localhost|127\.0\.0\.1)/.test(u);
const sqlFiles = (dir: string) => readdirSync(join(root, dir)).filter((f) => f.endsWith(".sql")).sort();
const read = (dir: string, f: string) => readFileSync(join(root, dir, f), "utf8");

async function withClient<T>(connectionString: string, fn: (c: pg.Client) => Promise<T>): Promise<T> {
  // hosted providers require TLS and present certificates a plain client cannot verify without extra setup; same rule as src/lib/db.ts
  const c = new pg.Client({ connectionString, ssl: isLocal(connectionString) ? undefined : { rejectUnauthorized: false } });
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
  if (!isLocal(url) && !process.argv.includes("--force")) throw new Error("refusing to reset a non-local database without --force (to only restore the demo data, use: reset-demo)");
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

/**
 * Removes accounts the end-to-end suite created (anything @example.test) plus, optionally, one exact email address (say, your own test
 * account from a walkthrough), with their campaigns, bookings and ledger legs; then restores the demo data. Demo and seeded accounts are never touched.
 */
async function cleanupE2e(c: pg.Client, email = ""): Promise<void> {
  const who = email.trim().toLowerCase();
  if (who && /^(demo\.|ops@)/.test(who)) throw new Error("refusing to remove a demo or seeded account");
  await c.query("begin");
  try {
    const mine = "email like '%@example.test' or email = $1";
    await c.query(`create temp table e2e_brand on commit drop as select id from brands where owner_id in (select id from accounts where ${mine})`, [who]);
    await c.query(`create temp table e2e_creator on commit drop as select id from creators where account_id in (select id from accounts where ${mine})`, [who]);
    await c.query(`create temp table e2e_booking on commit drop as
        select b.id from bookings b join campaigns c on c.id = b.campaign_id
         where c.brand_id in (select id from e2e_brand) or b.creator_id in (select id from e2e_creator)`);
    await c.query(`delete from ledger_entries where txn_id in (
        select txn_id from ledger_entries
         where brand_id in (select id from e2e_brand) or creator_id in (select id from e2e_creator) or booking_id in (select id from e2e_booking))`);
    await c.query("delete from campaigns where brand_id in (select id from e2e_brand)");
    await c.query("delete from bookings where id in (select id from e2e_booking)");
    await c.query("delete from creators where id in (select id from e2e_creator)");
    await c.query("delete from brands where id in (select id from e2e_brand)");
    const gone = await c.query(`delete from accounts where ${mine}`, [who]);
    await c.query("update creators c set balance_cents = coalesce((select sum(amount_cents) from ledger_entries l where l.creator_id = c.id and l.account = 'creator_balance'), 0)");
    await c.query("select app.seed_demo_state()");
    await c.query("commit");
    console.log(`removed ${gone.rowCount ?? 0} account(s)${who ? ` (including ${who})` : ""}`);
  } catch (e) {
    await c.query("rollback").catch(() => {});
    throw e;
  }
}

/** Can this database host Byline? Prints each fact so a failure explains itself. */
async function check(c: pg.Client): Promise<boolean> {
  let ok = true;
  const say = (good: boolean, msg: string) => {
    if (!good) ok = false;
    console.log(`${good ? "  ok  " : "  FAIL"} ${msg}`);
  };
  const host = new URL(url).host;
  console.log(`checking ${host}`);
  const v = (await c.query<{ v: number }>("select current_setting('server_version_num')::int as v")).rows[0]!.v;
  say(v >= 150000, `Postgres ${Math.floor(v / 10000)}.${v % 10000 % 100} (need 15 or newer)`);
  const me = (await c.query<{ rolcreaterole: boolean; rolsuper: boolean; user: string }>("select rolcreaterole, rolsuper, current_user as user from pg_roles where rolname = current_user")).rows[0]!;
  say(me.rolcreaterole || me.rolsuper, `role "${me.user}" can create roles (needed once, for the app's two least-privilege roles)`);
  const applied = await c.query("select 1 from information_schema.tables where table_name = 'schema_migrations'").then((r) => (r.rowCount ?? 0) > 0);
  console.log(`  info  migrations table: ${applied ? "present" : "not yet created (run migrate)"}`);
  if (applied) {
    const n = (await c.query<{ n: string }>("select count(*) as n from schema_migrations")).rows[0]!.n;
    console.log(`  info  ${n} of ${sqlFiles("db/migrations").length} migrations applied`);
  }
  if (/-pooler\.|:6543|pgbouncer/i.test(url)) console.log("  note  this looks like a pooled URL: use it for the app, but run migrate/seed with the direct (non-pooled) URL");
  return ok;
}

const cmd = process.argv[2];
if (cmd === "check") {
  const ok = await withClient(url, check);
  console.log(ok ? "this database is ready" : "this database is NOT ready: fix the FAIL lines above");
  process.exit(ok ? 0 : 1);
} else if (cmd === "cleanup-e2e") {
  await withClient(url, (c) => cleanupE2e(c, process.argv[3]));
  console.log("demo world restored");
} else if (cmd === "reset-demo") {
  await withClient(url, (c) => c.query("select app.seed_demo_state()"));
  console.log("demo world restored");
} else if (cmd === "migrate") console.log("applied:", (await withClient(url, migrate)).join(", ") || "nothing (up to date)");
else if (cmd === "seed") { await withClient(url, seed); console.log("seeded"); }
else if (cmd === "reset") {
  await reset();
  console.log("applied:", (await withClient(url, migrate)).length, "migrations");
  await withClient(url, seed);
  console.log("seeded");
} else if (cmd === "test") await runTests();
else { console.log("usage: node scripts/db.mts check|migrate|seed|reset-demo|cleanup-e2e|reset|test"); process.exit(2); }
