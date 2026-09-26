import { expect, test } from "@playwright/test";
import { asUserTx, auditLedger, sql } from "./helpers";

/**
 * Money and status changes race in real life: a double-click, two tabs, a slow network and a retry. Each case here fires the calls at the
 * same moment from separate database connections and checks that exactly one wins and the books still balance.
 */
const one = async <T extends Record<string, unknown>>(q: string, params: unknown[] = []) => (await sql<T>(q, params))[0]!;

test("two Release clicks at once pay the creator once", async () => {
  const b = await one<{ id: string; owner: string; price: number }>(
    `select b.id, br.owner_id as owner, b.price_cents as price from bookings b
       join campaigns c on c.id = b.campaign_id join brands br on br.id = c.brand_id
      where br.company_name = 'Halcyon Security' and b.status = 'live' limit 1`,
  );
  const release = () => asUserTx(b.owner, (q) => q("select release_payout($1)", [b.id]));
  const results = await Promise.allSettled([release(), release()]);
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  const paid = await one<{ n: string }>("select count(*) as n from ledger_entries where booking_id = $1 and kind = 'release' and account = 'creator_balance'", [b.id]);
  expect(Number(paid.n)).toBe(1);
  const total = await one<{ n: string }>("select sum(amount_cents) as n from ledger_entries where booking_id = $1 and account = 'creator_balance'", [b.id]);
  expect(Number(total.n)).toBe(b.price);
  expect(await auditLedger()).toEqual([]);
});

test("accepting and declining the same offer at once: one wins, and the money follows the winner", async () => {
  const b = await one<{ id: string; creator: string }>(
    `select b.id, cr.account_id as creator from bookings b join creators cr on cr.id = b.creator_id
      where cr.handle = 'maya-okafor' and b.status = 'invited' limit 1`,
  );
  const results = await Promise.allSettled([
    asUserTx(b.creator, (q) => q("select accept_offer($1)", [b.id])),
    asUserTx(b.creator, (q) => q("select decline_offer($1, 'no thanks')", [b.id])),
  ]);
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  const { status } = await one<{ status: string }>("select status from bookings where id = $1", [b.id]);
  expect(["accepted", "declined"]).toContain(status);
  expect(await auditLedger()).toEqual([]); // declined → refunded; accepted → still in escrow. Either way it adds up
});

test("two holds at once cannot spend the same money twice", async () => {
  const email = `race.${Date.now().toString(36)}@example.test`;
  const brand = await one<{ id: string }>("select create_account($1, 'not-a-real-hash', 'brand', 'Race Buyer', 'Race Co') as id", [email]);
  const creators = await sql<{ id: string; rate: number }>("select id, rate_cents as rate from creators where rate_cents between 60000 and 99000 order by handle limit 2");
  expect(creators).toHaveLength(2);
  const [a, b] = creators as [(typeof creators)[0], (typeof creators)[0]];
  expect(a.rate + b.rate).toBeGreaterThan(100_000); // each fits in the wallet on its own; both together do not

  await asUserTx(brand.id, (q) => q("select top_up_wallet(100000)"));
  const campaign = async (title: string) =>
    (
      await asUserTx(brand.id, (q) =>
        q("select create_campaign($1, '{}'::jsonb, 'demos', 'https://race.example/x', '', '', 100000, null) as id", [title]),
      )
    ).rows[0].id as string;
  const [c1, c2] = [await campaign("Race one"), await campaign("Race two")];

  const results = await Promise.allSettled([
    asUserTx(brand.id, (q) => q("select place_hold($1, $2::uuid[])", [c1, [a.id]])),
    asUserTx(brand.id, (q) => q("select place_hold($1, $2::uuid[])", [c2, [b.id]])),
  ]);
  const won = results.filter((r) => r.status === "fulfilled");
  const lost = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
  expect(won).toHaveLength(1);
  expect(lost).toHaveLength(1);
  expect(String(lost[0]!.reason)).toContain("insufficient_funds");

  const w = await one<{ w: number }>("select wallet_cents as w from brands where owner_id = $1", [brand.id]);
  expect(w.w).toBeGreaterThanOrEqual(0);
  expect(await auditLedger()).toEqual([]);
});

test("a creator cannot pay themselves, and a brand cannot approve or pay a deal that is not theirs", async () => {
  const mine = await one<{ owner: string }>("select owner_id as owner from brands where company_name = 'Northwind Data'");
  const other = await one<{ id: string }>(
    `select b.id from bookings b join campaigns c on c.id = b.campaign_id join brands br on br.id = c.brand_id
      where br.company_name = 'Halcyon Security' and b.status = 'drafted' limit 1`,
  );
  await expect(asUserTx(mine.owner, (q) => q("select approve_draft($1)", [other.id]))).rejects.toThrow();
  await expect(asUserTx(mine.owner, (q) => q("select release_payout($1)", [other.id]))).rejects.toThrow();
  const maya = await one<{ a: string }>("select account_id as a from creators where handle = 'maya-okafor'");
  await expect(asUserTx(maya.a, (q) => q("select release_payout($1)", [other.id]))).rejects.toThrow();
  await expect(asUserTx(maya.a, (q) => q("insert into ledger_entries (txn_id, account, amount_cents, kind) values (gen_random_uuid(), 'creator_balance', 100000, 'release')"))).rejects.toThrow();
  await expect(asUserTx(maya.a, (q) => q("update creators set balance_cents = balance_cents + 100000"))).rejects.toThrow();
  expect(await auditLedger()).toEqual([]);
});
