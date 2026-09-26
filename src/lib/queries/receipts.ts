import "server-only";
import type { ReceiptData } from "@/components/receipt/receipt";
import { asAnon } from "@/lib/db";
import { receiptNumber } from "@/lib/receipt";
import { CODE_RE } from "@/lib/tracking";

export interface ReceiptRow {
  code: string;
  status: "live" | "paid";
  live_at: Date | null;
  post_url: string | null;
  price_cents: number;
  handle: string;
  creator_name: string;
  brand_name: string;
  campaign_title: string;
  impressions: number | null;
  impressions_source: "self_reported" | "seeded" | null;
  clicks_total: string;
  clicks_unique: string;
}

export function toReceiptData(r: ReceiptRow): ReceiptData {
  return {
    number: receiptNumber(r.code),
    creatorName: r.creator_name,
    creatorHandle: r.handle,
    brandName: r.brand_name,
    campaign: r.campaign_title,
    liveAt: (r.live_at ?? new Date()).toISOString(),
    postUrl: r.post_url ?? "",
    impressions: r.impressions,
    impressionsSource: r.impressions_source ?? undefined,
    clicksTotal: Number(r.clicks_total),
    clicksUnique: Number(r.clicks_unique),
    feeCents: r.price_cents,
    status: r.status,
  };
}

/** One public Receipt by its code (null when unknown, malformed, or revoked). */
export async function loadReceipt(code: string): Promise<ReceiptRow | null> {
  if (!CODE_RE.test(code)) return null;
  const { rows } = await asAnon((c) => c.query<ReceiptRow>("select * from public_receipts where code = $1", [code]));
  return rows[0] ?? null;
}

/** The most convincing public Receipt to show on the landing page: paid, with the most unique clicks. */
export async function loadFeaturedReceipt(): Promise<ReceiptRow | null> {
  const { rows } = await asAnon((c) => c.query<ReceiptRow>("select * from public_receipts where status = 'paid' order by clicks_unique desc, paid_at desc limit 1"));
  return rows[0] ?? null;
}
