import { briefToParams } from "./brief-params";
import type { KitRow, PostRow, ReceiptRow } from "./queries/kit";
import { projectClicks } from "./projection";
import type { BriefValue, LineupCreator } from "./types";

/** The JSON the public API returns. Shared by the routes and the developer docs, so the examples cannot drift from reality. */
export function lineupBody(brief: BriefValue, total: number, creators: LineupCreator[]) {
  return {
    brief: { buyers: brief.buyers, verticals: brief.verticals, geo: brief.geo, budgetEuros: Math.round(brief.budgetCents / 100), query: briefToParams(brief) },
    total,
    count: creators.length,
    creators: creators.map((c) => ({
      handle: c.handle,
      name: c.name,
      headline: c.headline,
      verticals: c.verticals,
      followers: c.followers,
      rateCents: c.rateCents,
      fit: c.fit,
      why: c.why,
      projection: c.projection,
      url: `/c/${c.handle}`,
      sandbox: Boolean(c.isSandbox),
    })),
  };
}

export function kitBody(kit: KitRow, posts: PostRow[], receipts: ReceiptRow[]) {
  return {
    handle: kit.handle,
    name: kit.display_name,
    headline: kit.headline,
    bio: kit.bio,
    country: kit.country,
    verticals: kit.verticals,
    followers: kit.followers,
    rateCents: kit.rate_cents,
    typicalImpressions: kit.imp_p50,
    projectedClicks: projectClicks(kit.imp_p25, kit.imp_p50, kit.imp_p75, Number(kit.ctr_p50)),
    audience: { ...kit.audience, source: "self_reported" as const },
    sandbox: kit.is_sandbox,
    recentPosts: posts.map((p) => ({ hook: p.hook, impressions: p.impressions, clicks: p.clicks, publishedAt: p.published_at.toISOString() })),
    receipts: receipts.map((r) => ({ url: `/receipt/${r.code}`, campaign: r.campaign_title, brand: r.brand_name, uniqueClicks: Number(r.clicks_unique), feeCents: r.price_cents, paidAt: r.paid_at?.toISOString() ?? null })),
    url: `/c/${kit.handle}`,
  };
}
