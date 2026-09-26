import "server-only";
import { asUser } from "@/lib/db";
import type { BookingStatus } from "@/lib/types";

export interface Deal {
  booking_id: string;
  status: BookingStatus;
  price_cents: number;
  due_at: Date | null;
  invited_at: Date;
  live_at: Date | null;
  paid_at: Date | null;
  campaign_title: string;
  brand_name: string;
  key_messages: string;
  guidelines: string;
  objective: string;
  destination_url: string;
  draft_text: string | null;
  draft_version: number;
  post_url: string | null;
  tracking_code: string;
}

export interface DealEvent {
  id: string;
  kind: string;
  note: string | null;
  meta: Record<string, unknown>;
  at: Date;
}

const COLS = `booking_id, status, price_cents, due_at, invited_at, live_at, paid_at, campaign_title, brand_name, key_messages, guidelines,
              objective, destination_url, draft_text, draft_version, post_url, tracking_code`;

export const loadDeals = (userId: string) =>
  asUser(userId, async (c) => (await c.query<Deal>(`select ${COLS} from my_offers order by invited_at desc`)).rows);

/** One deal with its history, click metrics and self-reported stats. RLS scopes all of it to this creator. */
export async function loadDeal(userId: string, bookingId: string) {
  return asUser(userId, async (c) => {
    const d = await c.query<Deal>(`select ${COLS} from my_offers where booking_id = $1`, [bookingId]);
    const deal = d.rows[0];
    if (!deal) return null;
    const events = await c.query<DealEvent>("select id::text, kind, note, meta, at from booking_events where booking_id = $1 order by at, id", [bookingId]);
    const m = await c.query<{ clicks_total: string; clicks_unique: string }>("select clicks_total, clicks_unique from booking_metrics where booking_id = $1", [bookingId]);
    const s = await c.query<{ impressions: number; reactions: number; comments: number; source: string }>("select impressions, reactions, comments, source from post_stats where booking_id = $1", [bookingId]);
    return {
      deal,
      events: events.rows,
      clicksTotal: Number(m.rows[0]?.clicks_total ?? 0),
      clicksUnique: Number(m.rows[0]?.clicks_unique ?? 0),
      stats: s.rows[0] ?? null,
    };
  });
}

export async function loadEarnings(userId: string) {
  return asUser(userId, async (c) => {
    const bal = await c.query<{ balance_cents: number }>("select balance_cents from creators");
    const rows = await c.query<{ id: string; at: Date; amount_cents: number; campaign_title: string | null; brand_name: string | null }>(
      `select le.id::text, le.at, le.amount_cents, mo.campaign_title, mo.brand_name
         from ledger_entries le left join my_offers mo on mo.booking_id = le.booking_id
        where le.account = 'creator_balance' order by le.at desc, le.id desc limit 50`,
    );
    return { balanceCents: bal.rows[0]?.balance_cents ?? 0, payouts: rows.rows };
  });
}

/** How the creator sees each stage. */
export const STAGES: { key: string; title: string; statuses: BookingStatus[]; hint: string }[] = [
  { key: "write", title: "To write", statuses: ["accepted", "changes_requested"], hint: "Write or revise your draft." },
  { key: "review", title: "In review", statuses: ["drafted"], hint: "Waiting for the brand." },
  { key: "post", title: "To post", statuses: ["approved"], hint: "Approved. Post it and add the link." },
  { key: "live", title: "Live", statuses: ["live"], hint: "Waiting for the payout." },
  { key: "paid", title: "Paid", statuses: ["paid"], hint: "In your balance." },
];

export const NEXT_ACTION: Record<BookingStatus, string> = {
  invited: "Accept or decline",
  accepted: "Write your draft",
  changes_requested: "Revise your draft",
  drafted: "Waiting for the brand",
  approved: "Post it, then add the link",
  live: "Live, waiting for payout",
  paid: "Paid",
  declined: "You declined",
  cancelled: "Cancelled by the brand",
};
