import type { Metadata } from "next";
import Link from "next/link";
import { Dateline } from "@/components/ui/dateline";
import { EmptyState } from "@/components/ui/empty-state";
import { Stamp } from "@/components/ui/stamp";
import { requireRole } from "@/lib/auth";
import { formatEUR } from "@/lib/money";
import { NEXT_ACTION, STAGES, loadDeals, type Deal } from "@/lib/queries/creator";
import { formatDay } from "@/lib/time";

export const metadata: Metadata = { title: "Deals" };

function Card({ d }: { d: Deal }) {
  return (
    <li>
      <Link href={`/deals/${d.booking_id}`} className="block min-h-11 border border-line-strong bg-paper-2 p-4 hover:border-ink">
        <span className="flex items-start justify-between gap-3">
          <span className="font-serif text-[1.2rem] leading-tight">{d.campaign_title}</span>
          <Stamp status={d.status} />
        </span>
        <span className="mt-1 block text-small text-muted">
          {d.brand_name} · <span className="font-mono tabular-nums">{formatEUR(d.price_cents)}</span>
          {d.due_at ? ` · by ${formatDay(d.due_at.toISOString())}` : ""}
        </span>
        <span className="mt-2 block text-small font-medium">{NEXT_ACTION[d.status]} →</span>
      </Link>
    </li>
  );
}

export default async function Deals() {
  const s = await requireRole("creator", "/deals");
  const all = await loadDeals(s.accountId);
  const active = all.filter((d) => d.status !== "invited");
  const closed = all.filter((d) => d.status === "declined" || d.status === "cancelled");
  const open = all.filter((d) => d.status === "invited").length;
  return (
    <div>
      <Dateline>Deals · {active.length - closed.length} open</Dateline>
      <h1 className="mt-1 text-display">Your deals</h1>
      {open ? (
        <p className="mt-2 text-small">
          <Link href="/offers" className="underline decoration-vermilion-ink underline-offset-4">
            {open} {open === 1 ? "offer is" : "offers are"} waiting for your answer
          </Link>
        </p>
      ) : null}
      {active.length === 0 ? (
        <div className="mt-8 max-w-2xl">
          <EmptyState title="No deals yet" body="Accept an offer and it moves here, where you write the draft, go live and get paid." />
        </div>
      ) : (
        <div className="mt-8 grid gap-8 xl:grid-cols-5 xl:gap-5">
          {STAGES.map((st) => {
            const items = all.filter((d) => st.statuses.includes(d.status));
            return (
              <section key={st.key} aria-labelledby={`st-${st.key}`} className={items.length ? "" : "hidden xl:block"}>
                <div className="flex items-baseline justify-between border-b border-ink pb-2">
                  <h2 id={`st-${st.key}`} className="font-serif text-title">
                    {st.title}
                  </h2>
                  <span className="font-mono text-caption text-muted">{items.length}</span>
                </div>
                {items.length ? (
                  <ul className="mt-3 grid gap-3">
                    {items.map((d) => (
                      <Card key={d.booking_id} d={d} />
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-small text-muted">{st.hint}</p>
                )}
              </section>
            );
          })}
        </div>
      )}
      {closed.length ? (
        <section className="mt-12" aria-labelledby="closed">
          <h2 id="closed" className="font-mono text-caption font-normal text-muted">
            Closed
          </h2>
          <ul className="mt-2 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {closed.map((d) => (
              <Card key={d.booking_id} d={d} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
