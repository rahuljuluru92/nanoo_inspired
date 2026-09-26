import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";
import pg from "pg";

/** True when the suite is pointed at a deployed site (E2E_BASE_URL). Tests that spoof a client IP cannot run there: the platform sets it. */
export const LIVE = Boolean(process.env.E2E_BASE_URL);
export const DB_URL = process.env.DATABASE_URL ?? "postgres://postgres@127.0.0.1:54322/byline";
export const STATE = { brand: ".local/e2e/brand.json", creator: ".local/e2e/creator.json" };
export const HUMAN_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";

/** Direct, read-mostly SQL for assertions and for finding ids. Uses the owner connection, like the tooling does. */
export async function sql<T extends pg.QueryResultRow = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  const c = new pg.Client({ connectionString: DB_URL });
  await c.connect();
  try {
    return (await c.query<T>(text, params)).rows;
  } finally {
    await c.end();
  }
}

/** Ids of seeded things, looked up live (they are random UUIDs and codes). */
export async function seeded() {
  const one = async (q: string) => (await sql<{ v: string }>(q))[0]!.v;
  return {
    brandCampaign: await one("select c.id as v from campaigns c join brands b on b.id = c.brand_id where b.company_name = 'Halcyon Security' order by c.created_at limit 1"),
    otherBrandCampaign: await one("select c.id as v from campaigns c join brands b on b.id = c.brand_id where b.company_name = 'Northwind Data' limit 1"),
    mayaDeal: await one("select b.id as v from bookings b join creators cr on cr.id = b.creator_id where cr.handle = 'maya-okafor' and b.status = 'accepted' limit 1"),
    otherCreatorBooking: await one("select b.id as v from bookings b join creators cr on cr.id = b.creator_id where cr.handle = 'tobias-krause' limit 1"),
    paidReceipt: await one("select tracking_code as v from bookings where status = 'paid' order by paid_at limit 1"),
  };
}

/** Collects console errors and uncaught page errors; call `.assertNone()` at the end of a flow. */
export function watchErrors(page: Page, ignore: RegExp[] = []) {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error" && !ignore.some((re) => re.test(m.text()))) errors.push(`console: ${m.text()}`);
  });
  page.on("pageerror", (e) => {
    if (!ignore.some((re) => re.test(e.message))) errors.push(`pageerror: ${e.message}`);
  });
  return { errors, assertNone: () => expect(errors, `unexpected browser errors:\n${errors.join("\n")}`).toEqual([]) };
}

export async function overflowPx(page: Page): Promise<number> {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

export async function axeViolations(page: Page): Promise<string[]> {
  const r = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"])
    // target-size treats whatever a sticky bar happens to cover at the current scroll position as an undersized target;
    // `smallTargets` below measures the controls themselves against the stricter 44 px standard
    .disableRules(["target-size"])
    .analyze();
  return r.violations.map((v) => `${v.id} x${v.nodes.length} :: ${v.nodes[0]?.target.join(" ").slice(0, 80)}`);
}

/** Interactive controls shorter than 44 px (the touch standard), ignoring inline text links and hidden or screen-reader-only ones. */
export async function smallTargets(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const out: string[] = [];
    document.querySelectorAll<HTMLElement>("a[href], button, input, select, textarea, summary, [role=button]").forEach((el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      if (r.width < 2 || r.height < 2 || cs.visibility === "hidden" || el.closest(".sr-only")) return;
      if (el.matches("input[type=hidden], input[type=checkbox], input[type=radio]")) return;
      if (el.matches("a") && cs.display === "inline") return; // a link inside a sentence
      if (el.id === "main" || el.matches("a[href='#main']")) return; // the skip link, shown only on focus
      if (r.height < 43.5) out.push(`${el.tagName.toLowerCase()} "${(el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 24)}" h=${Math.round(r.height)}`);
    });
    return [...new Set(out)];
  });
}

/** Runs `fn` the way the app does: one transaction, privileges dropped to the app role, the caller recorded for row-level security. */
export async function asUserTx<T>(userId: string, fn: (q: (text: string, params?: unknown[]) => Promise<pg.QueryResult>) => Promise<T>): Promise<T> {
  const c = new pg.Client({ connectionString: DB_URL });
  await c.connect();
  try {
    await c.query("begin");
    await c.query("set local role byline_user");
    await c.query("select set_config('app.user_id', $1, true)", [userId]);
    const out = await fn((text, params = []) => c.query(text, params));
    await c.query("commit");
    return out;
  } catch (e) {
    await c.query("rollback").catch(() => {});
    throw e;
  } finally {
    await c.end();
  }
}

/** The money invariants, for the whole database. Returns what is wrong (empty when the books balance). */
export async function auditLedger(): Promise<string[]> {
  const bad: string[] = [];
  const n = async (q: string) => Number((await sql<{ n: string }>(q))[0]!.n);
  if (await n("select count(*) as n from (select txn_id from ledger_entries group by txn_id having sum(amount_cents) <> 0) x")) bad.push("a transaction does not net to zero");
  if (await n(`select count(*) as n from brands b where b.wallet_cents <> coalesce((select sum(amount_cents) from ledger_entries l where l.brand_id = b.id and l.account = 'brand_wallet'), 0)`)) bad.push("a brand wallet differs from its ledger");
  if (await n(`select count(*) as n from brands where wallet_cents < 0`)) bad.push("a wallet is negative");
  if (await n(`select count(*) as n from creators c where c.balance_cents <> coalesce((select sum(amount_cents) from ledger_entries l where l.creator_id = c.id and l.account = 'creator_balance'), 0)`)) bad.push("a creator balance differs from its ledger");
  if (
    await n(`select count(*) as n from bookings b
             where coalesce((select sum(amount_cents) from ledger_entries l where l.booking_id = b.id and l.account = 'escrow'), 0)
                   <> case when b.status in ('paid','declined','cancelled') then 0 else b.price_cents end`)
  )
    bad.push("escrow does not match a booking's state");
  return bad;
}
