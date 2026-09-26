import type { Metadata } from "next";
import { Dateline } from "@/components/ui/dateline";
import { EmptyState } from "@/components/ui/empty-state";
import { Stamp } from "@/components/ui/stamp";
import { requireRole } from "@/lib/auth";
import { asUser } from "@/lib/db";
import { formatEUR } from "@/lib/money";
import { formatDay } from "@/lib/time";
import type { BookingStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Offers" };

interface OfferRow {
  booking_id: string;
  status: BookingStatus;
  price_cents: number;
  campaign_title: string;
  brand_name: string;
  key_messages: string;
  due_at: Date | null;
}

/** Read-only for now; accept, decline and deliver arrive with the creator slice. */
export default async function Offers() {
  const s = await requireRole("creator", "/offers");
  const { rows } = await asUser(s.accountId, (c) =>
    c.query<OfferRow>("select booking_id, status, price_cents, campaign_title, brand_name, key_messages, due_at from my_offers order by invited_at desc"),
  );
  return (
    <div>
      <Dateline>Offers · {rows.length}</Dateline>
      <h1 className="mt-1 text-display">Your offers</h1>
      {rows.length === 0 ? (
        <div className="mt-8">
          <EmptyState title="No offers yet" body="When a brand books you, the offer lands here with the price you set." />
        </div>
      ) : (
        <ul className="mt-8 max-w-3xl border-b border-line">
          {rows.map((r) => (
            <li key={r.booking_id} className="grid gap-1 border-t border-line py-4">
              <div className="flex items-start justify-between gap-4">
                <p className="font-serif text-[1.35rem] leading-tight">{r.campaign_title}</p>
                <Stamp status={r.status} />
              </div>
              <p className="text-small text-muted">
                {r.brand_name} · {formatEUR(r.price_cents)}
                {r.due_at ? ` · publish by ${formatDay(r.due_at.toISOString())}` : ""}
              </p>
              {r.key_messages ? <p className="text-small">{r.key_messages}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
