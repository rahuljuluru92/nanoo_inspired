import type { Metadata } from "next";
import Link from "next/link";
import { OfferCard } from "@/components/creator/offer-card";
import { Dateline } from "@/components/ui/dateline";
import { EmptyState } from "@/components/ui/empty-state";
import { requireRole } from "@/lib/auth";
import { loadDeals } from "@/lib/queries/creator";

export const metadata: Metadata = { title: "Offers" };

export default async function Offers() {
  const s = await requireRole("creator", "/offers");
  const invited = (await loadDeals(s.accountId)).filter((d) => d.status === "invited");
  return (
    <div>
      <Dateline>Offers · {invited.length} waiting</Dateline>
      <h1 className="mt-1 text-display">Your offers</h1>
      {invited.length === 0 ? (
        <div className="mt-8 max-w-2xl">
          <EmptyState
            title="No offers waiting"
            body="When a brand books you, the offer lands here with the price you set. Accepted offers move to Deals."
            action={
              <Link href="/deals" className="inline-flex min-h-11 items-center underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                Go to your deals
              </Link>
            }
          />
        </div>
      ) : (
        <ul className="mt-8 grid max-w-3xl gap-5">
          {invited.map((d) => (
            <OfferCard
              key={d.booking_id}
              offer={{
                bookingId: d.booking_id,
                campaignTitle: d.campaign_title,
                brandName: d.brand_name,
                priceCents: d.price_cents,
                publishBy: d.due_at ? d.due_at.toISOString() : null,
                keyMessages: d.key_messages,
                guidelines: d.guidelines,
              }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
