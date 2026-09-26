import type { NextRequest } from "next/server";
import { apiError, json, preflight, throttle } from "@/lib/api";
import { loadKit } from "@/lib/queries/kit";
import { projectClicks } from "@/lib/projection";

export const dynamic = "force-dynamic";
export const OPTIONS = preflight;

/** GET /api/creators/{handle}: a creator's public kit as JSON. Audience and reach numbers are self-reported; only Receipt clicks are verified. */
export async function GET(req: NextRequest, ctx: { params: Promise<{ handle: string }> }) {
  const limited = throttle(req, "creator");
  if (limited) return limited;
  const { handle } = await ctx.params;
  if (!/^[a-z0-9-]{3,40}$/.test(handle)) return apiError(404, "not_found", "No creator with that handle.");
  try {
    const d = await loadKit(handle);
    if (!d) return apiError(404, "not_found", "No creator with that handle.");
    const { kit, posts, receipts } = d;
    return json({
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
      audience: { ...kit.audience, source: "self_reported" },
      sandbox: kit.is_sandbox,
      recentPosts: posts.map((p) => ({ hook: p.hook, impressions: p.impressions, clicks: p.clicks, publishedAt: p.published_at.toISOString() })),
      receipts: receipts.map((r) => ({ url: `/receipt/${r.code}`, campaign: r.campaign_title, brand: r.brand_name, uniqueClicks: Number(r.clicks_unique), feeCents: r.price_cents, paidAt: r.paid_at?.toISOString() ?? null })),
      url: `/c/${kit.handle}`,
    });
  } catch {
    return apiError(503, "unavailable", "The kit is temporarily unavailable.");
  }
}
