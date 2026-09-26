import type { Metadata } from "next";
import { Dateline } from "@/components/ui/dateline";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { requireRole } from "@/lib/auth";
import { formatEUR } from "@/lib/money";
import { loadEarnings } from "@/lib/queries/creator";

export const metadata: Metadata = { title: "Earnings" };

export default async function Earnings() {
  const s = await requireRole("creator", "/earnings");
  const { balanceCents, payouts } = await loadEarnings(s.accountId);
  return (
    <div>
      <Dateline>Earnings · test mode</Dateline>
      <h1 className="mt-1 text-display">Earnings</h1>
      <dl className="mt-8 max-w-xl border-y border-line py-5">
        <dt className="font-mono text-caption text-muted">Balance</dt>
        <dd className="font-serif text-display-xl tabular-nums">{formatEUR(balanceCents)}</dd>
      </dl>
      <p className="mt-3 max-w-prose text-small text-muted">Byline is in test mode: payouts land in this balance as real ledger entries, but no bank transfer happens. You keep 100% of your rate.</p>
      <h2 className="mt-12 text-title">Payouts</h2>
      <div className="mt-4 max-w-3xl">
        {payouts.length === 0 ? (
          <EmptyState title="No payouts yet" body="When a brand releases a payout for a live post, it appears here." />
        ) : (
          <Table caption="Payout history">
            <THead>
              <TR>
                <TH>When (UTC)</TH>
                <TH>Deal</TH>
                <TH num>Amount</TH>
              </TR>
            </THead>
            <TBody>
              {payouts.map((r) => (
                <TR key={r.id}>
                  <TD className="whitespace-nowrap font-mono text-caption">{r.at.toISOString().slice(0, 16).replace("T", " ")}</TD>
                  <TD>
                    {r.campaign_title ?? "—"} <span className="text-muted">{r.brand_name ? `· ${r.brand_name}` : ""}</span>
                  </TD>
                  <TD num>+{formatEUR(r.amount_cents)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </div>
    </div>
  );
}
