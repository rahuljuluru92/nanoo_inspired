import type { Metadata } from "next";
import Link from "next/link";
import { Dateline } from "@/components/ui/dateline";
import { EmptyState } from "@/components/ui/empty-state";
import { ButtonLink } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import { asUser } from "@/lib/db";
import { formatEUR } from "@/lib/money";
import { formatDay } from "@/lib/time";
import { tickSandbox } from "@/lib/queries/tick";

export const metadata: Metadata = { title: "Campaigns" };

interface Row {
  id: string;
  title: string;
  status: string;
  created_at: Date;
  budget_cents: number;
  bookings: string;
  committed: string;
  running: string;
}

export default async function Campaigns() {
  const s = await requireRole("brand", "/campaigns");
  await tickSandbox(s.accountId);
  const { rows } = await asUser(s.accountId, (c) =>
    c.query<Row>(
      `select c.id, c.title, c.status, c.created_at, c.budget_cents,
              count(b.id) as bookings,
              coalesce(sum(b.price_cents) filter (where b.status not in ('declined','cancelled')), 0) as committed,
              count(b.id) filter (where b.status in ('live','paid')) as running
         from campaigns c left join bookings b on b.campaign_id = c.id
        group by c.id order by c.created_at desc`,
    ),
  );
  return (
    <div>
      <Dateline>Campaigns · {rows.length}</Dateline>
      <h1 className="mt-1 text-display">Your campaigns</h1>
      {rows.length === 0 ? (
        <div className="mt-8">
          <EmptyState title="Write your first brief" body="Say who you want to reach and what you can spend. The lineup assembles as you type." action={<ButtonLink href="/desk" variant="primary">Open the desk</ButtonLink>} />
        </div>
      ) : (
        <ul className="mt-8 max-w-4xl border-b border-line">
          {rows.map((r) => (
            <li key={r.id} className="border-t border-line">
              <Link href={`/campaigns/${r.id}`} className="grid gap-1 py-4 hover:bg-highlight/20 sm:grid-cols-[1fr_auto] sm:items-baseline sm:gap-6 sm:px-2">
                <span className="font-serif text-[1.45rem] leading-tight">{r.title}</span>
                <span className="font-mono text-caption text-muted sm:text-right">
                  {r.status} · created {formatDay(r.created_at.toISOString())}
                </span>
                <span className="font-mono text-small tabular-nums sm:col-span-2">
                  {Number(r.bookings)} {Number(r.bookings) === 1 ? "booking" : "bookings"} · {formatEUR(Number(r.committed))} committed · {Number(r.running)} live or paid
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
