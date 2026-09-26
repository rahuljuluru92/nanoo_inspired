import "server-only";
import { asAnon } from "@/lib/db";

export interface KitRow {
  id: string;
  handle: string;
  display_name: string;
  headline: string;
  bio: string;
  country: string | null;
  verticals: string[];
  followers: number;
  rate_cents: number;
  imp_p25: number;
  imp_p50: number;
  imp_p75: number;
  ctr_p50: string;
  is_sandbox: boolean;
  audience: { roles?: Record<string, number>; geo?: Record<string, number> };
}
export interface PostRow {
  hook: string;
  impressions: number;
  clicks: number;
  published_at: Date;
}
export interface ReceiptRow {
  code: string;
  campaign_title: string;
  brand_name: string;
  clicks_unique: string;
  price_cents: number;
  paid_at: Date | null;
}

/** A creator's public kit: profile, recent posts and paid Receipts. Everything here is already public (read as a visitor). */
export async function loadKit(handle: string) {
  return asAnon(async (c) => {
    const k = await c.query<KitRow>(
      `select id, handle, display_name, headline, bio, country, verticals, followers, rate_cents, imp_p25, imp_p50, imp_p75, ctr_p50, is_sandbox, audience
         from public_creators where handle = $1`,
      [handle],
    );
    const kit = k.rows[0];
    if (!kit) return null;
    const posts = await c.query<PostRow>("select hook, impressions, clicks, published_at from creator_posts where creator_id = $1 order by published_at desc limit 6", [kit.id]);
    const rc = await c.query<ReceiptRow>("select code, campaign_title, brand_name, clicks_unique, price_cents, paid_at from public_receipts where handle = $1 and status = 'paid' order by paid_at desc limit 6", [handle]);
    return { kit, posts: posts.rows, receipts: rc.rows };
  });
}
