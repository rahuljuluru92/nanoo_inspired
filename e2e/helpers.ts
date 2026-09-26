import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";
import pg from "pg";

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
export function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console: ${m.text()}`);
  });
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  return { errors, assertNone: () => expect(errors, `unexpected browser errors:\n${errors.join("\n")}`).toEqual([]) };
}

export async function overflowPx(page: Page): Promise<number> {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

export async function axeViolations(page: Page): Promise<string[]> {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"]).analyze();
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
