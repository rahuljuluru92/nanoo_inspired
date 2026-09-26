import "server-only";
import { Pool, type PoolClient } from "pg";

/**
 * One pool per server instance. Every USER request runs inside a transaction that first drops privileges
 * (SET LOCAL ROLE byline_user) and records who is calling (app.user_id) — so row-level security applies to the
 * database session itself, not just to our own checks. Works against any Postgres via DATABASE_URL.
 */
declare global {
  var __bylinePool: Pool | undefined;
}

function pool(): Pool {
  if (!globalThis.__bylinePool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local.");
    const local = /(localhost|127\.0\.0\.1)/.test(url);
    const p = new Pool({
      connectionString: url,
      max: 5,
      ssl: local ? undefined : { rejectUnauthorized: false },
      connectionTimeoutMillis: 10_000, // fail with a clear error instead of hanging when the database is unreachable (a suspended hosted database wakes in a few seconds)
      idleTimeoutMillis: 10_000, // serverless instances freeze; do not hold sockets a pooler will have dropped
      keepAlive: true,
    });
    // A hosted database or its pooler may drop an idle socket. Without a listener, Node treats that "error" event as fatal and kills the instance.
    p.on("error", (e) => console.error("idle database client error:", e.message));
    globalThis.__bylinePool = p;
  }
  return globalThis.__bylinePool;
}

async function inTransaction<T>(role: "byline_user" | "byline_anon", userId: string | null, fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const c = await pool().connect();
  try {
    await c.query("begin");
    await c.query(`set local role ${role}`);
    await c.query("select set_config('app.user_id', $1, true)", [userId ?? ""]);
    const out = await fn(c);
    await c.query("commit");
    return out;
  } catch (e) {
    await c.query("rollback").catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}

/** Signed-in user: RLS applies. All money and status changes go through the RPCs. */
export const asUser = <T>(userId: string, fn: (c: PoolClient) => Promise<T>) => inTransaction("byline_user", userId, fn);

/** Signed-out visitor: the public catalogue and public receipts only. */
export const asAnon = <T>(fn: (c: PoolClient) => Promise<T>) => inTransaction("byline_anon", null, fn);

/** Server-only work that must see everything: sessions, account creation, click recording. Never called with user input as SQL. */
export async function asOwner<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const c = await pool().connect();
  try {
    return await fn(c);
  } finally {
    c.release();
  }
}
