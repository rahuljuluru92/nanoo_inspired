import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DealPanel } from "@/components/creator/deal-panel";
import { AutoRefresh } from "@/components/ui/auto-refresh";
import { Dateline } from "@/components/ui/dateline";
import { LocalTime } from "@/components/ui/local-time";
import { Stamp } from "@/components/ui/stamp";
import { requireRole } from "@/lib/auth";
import { formatEUR } from "@/lib/money";
import { loadDeal } from "@/lib/queries/creator";
import { formatDay } from "@/lib/time";
import { creatorEventLabel } from "@/lib/timeline";

export const metadata: Metadata = { title: "Deal" };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function DealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const s = await requireRole("creator", `/deals/${id}`);
  const data = await loadDeal(s.accountId, id);
  if (!data) notFound();
  const { deal, events, clicksTotal, clicksUnique, stats } = data;
  const lastChange = [...events].reverse().find((e) => e.kind === "changes_requested");
  // clicks arrive while a post is live: keep the counters fresh
  const live = deal.status === "live";

  return (
    <div className="max-w-5xl">
      <AutoRefresh active={live} everyMs={8000} />
      <Link href="/deals" className="inline-flex min-h-11 items-center text-small text-muted underline decoration-line-strong underline-offset-4 hover:text-ink">
        ← All deals
      </Link>
      <Dateline className="mt-2">
        {deal.brand_name}
        {deal.due_at ? ` · publish by ${formatDay(deal.due_at.toISOString())}` : ""}
      </Dateline>
      <div className="mt-1 flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-display">{deal.campaign_title}</h1>
        <Stamp status={deal.status} className="mt-2" />
      </div>
      <p className="mt-2 font-serif text-title tabular-nums">{formatEUR(deal.price_cents)}</p>
      {deal.key_messages ? (
        <p className="mt-2 max-w-prose text-small">
          <span className="font-mono text-caption text-muted">The ask · </span>
          {deal.key_messages}
        </p>
      ) : null}

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid content-start gap-8">
          <DealPanel
            bookingId={deal.booking_id}
            status={deal.status}
            brandName={deal.brand_name}
            priceCents={deal.price_cents}
            draftText={deal.draft_text ?? ""}
            changesNote={deal.status === "changes_requested" ? (lastChange?.note ?? null) : null}
            postUrl={deal.post_url}
            trackingCode={deal.tracking_code}
            clicksUnique={clicksUnique}
            clicksTotal={clicksTotal}
            stats={stats}
          />
        </div>

        <aside className="grid content-start gap-8" aria-label="Brief and history">
          <section aria-labelledby="brief">
            <h2 id="brief" className="font-serif text-title">
              What {deal.brand_name} asked
            </h2>
            <dl className="mt-3 grid gap-4 text-small">
              {deal.key_messages ? (
                <div>
                  <dt className="font-mono text-caption text-muted">Key message</dt>
                  <dd>{deal.key_messages}</dd>
                </div>
              ) : null}
              {deal.guidelines ? (
                <div>
                  <dt className="font-mono text-caption text-muted">Guidelines</dt>
                  <dd>{deal.guidelines}</dd>
                </div>
              ) : null}
              <div>
                <dt className="font-mono text-caption text-muted">Objective</dt>
                <dd>{deal.objective === "demos" ? "Book demos" : deal.objective === "signups" ? "Drive sign-ups" : "Build awareness"}</dd>
              </div>
            </dl>
          </section>
          <section aria-labelledby="history">
            <h2 id="history" className="font-serif text-title">
              History
            </h2>
            <ol className="mt-3 border-b border-line">
              {[...events].reverse().map((e) => (
                <li key={e.id} className="grid grid-cols-[3.25rem_1fr] gap-3 border-t border-line py-2.5 text-small">
                  <span className="font-mono text-caption text-muted">
                    <LocalTime iso={e.at.toISOString()} mode="clock" />
                  </span>
                  <span>{creatorEventLabel(e.kind, e.note, e.meta)}</span>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
    </div>
  );
}
