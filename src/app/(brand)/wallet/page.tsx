import type { Metadata } from "next";
import { Dateline } from "@/components/ui/dateline";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { requireRole } from "@/lib/auth";
import { asUser } from "@/lib/db";
import { formatEUR } from "@/lib/money";
import { TopUp } from "./top-up";
import { tickSandbox } from "@/lib/queries/tick";

export const metadata: Metadata = { title: "Wallet" };

interface Row {
  id: string;
  at: Date;
  kind: string;
  amount_cents: number;
  balance_cents: number;
  who: string | null;
}
const LABEL: Record<string, string> = { topup: "Top-up (test funds)", hold: "Hold", refund: "Refund" };

export default async function Wallet() {
  const s = await requireRole("brand", "/wallet");
  await tickSandbox(s.accountId);
  const { wallet, escrow, rows } = await asUser(s.accountId, async (c) => {
    const w = await c.query<{ wallet_cents: number; escrow_cents: number }>(
      `select b.wallet_cents, coalesce((select sum(amount_cents) from ledger_entries l where l.brand_id = b.id and l.account = 'escrow'), 0)::int as escrow_cents from brands b`,
    );
    const l = await c.query<Row>(
      `select * from (
         select le.id::text, le.at, le.kind, le.amount_cents,
                sum(le.amount_cents) over (order by le.at, le.id)::int as balance_cents,
                cr.display_name as who
           from ledger_entries le
           left join bookings b on b.id = le.booking_id
           left join public_creators cr on cr.id = b.creator_id
          where le.account = 'brand_wallet') x
        order by at desc, id desc limit 60`,
    );
    return { wallet: w.rows[0]?.wallet_cents ?? 0, escrow: w.rows[0]?.escrow_cents ?? 0, rows: l.rows };
  });
  return (
    <div>
      <Dateline>Wallet · test mode</Dateline>
      <h1 className="mt-1 text-display">Wallet</h1>
      <dl className="mt-8 grid max-w-xl grid-cols-2 gap-8 border-y border-line py-5">
        <div>
          <dt className="font-mono text-caption text-muted">Available</dt>
          <dd className="font-serif text-display tabular-nums">{formatEUR(wallet)}</dd>
        </div>
        <div>
          <dt className="font-mono text-caption text-muted">In escrow</dt>
          <dd className="font-serif text-display tabular-nums">{formatEUR(escrow)}</dd>
        </div>
      </dl>
      <h2 className="mt-8 text-title">Add test funds</h2>
      <p className="mt-1 max-w-prose text-small text-muted">Byline is in test mode: top-ups are real ledger entries, but no card is charged and no money moves.</p>
      <div className="mt-4">
        <TopUp />
      </div>
      <h2 className="mt-12 text-title">Ledger</h2>
      <div className="mt-4 max-w-4xl">
        {rows.length === 0 ? (
          <EmptyState title="No movements yet" body="Top-ups, holds and refunds appear here, newest first." />
        ) : (
          <Table caption="Wallet ledger">
            <THead>
              <TR>
                <TH>When (UTC)</TH>
                <TH>Kind</TH>
                <TH>Reference</TH>
                <TH num>Amount</TH>
                <TH num>Balance</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((r) => (
                <TR key={r.id}>
                  <TD className="whitespace-nowrap font-mono text-caption">{r.at.toISOString().slice(0, 16).replace("T", " ")}</TD>
                  <TD>{LABEL[r.kind] ?? r.kind}</TD>
                  <TD className="text-muted">{r.who ?? ""}</TD>
                  <TD num>{`${r.amount_cents > 0 ? "+" : "−"}${formatEUR(Math.abs(r.amount_cents))}`}</TD>
                  <TD num>{formatEUR(r.balance_cents)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </div>
    </div>
  );
}
