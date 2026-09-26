import type { NextRequest } from "next/server";
import { apiError, json, preflight, throttle } from "@/lib/api";
import { briefToParams, parseBriefParams } from "@/lib/brief-params";
import { getLineup } from "@/lib/lineup";

export const dynamic = "force-dynamic";
export const OPTIONS = preflight;

/**
 * GET /api/lineup?buyers=CTOs,Security%20leads&verticals=Fintech&geo=France&budget=6000&limit=12
 * The ranked lineup for a brief, straight from the database. Budget is in whole euros; unknown values are ignored.
 */
export async function GET(req: NextRequest) {
  const limited = throttle(req, "lineup");
  if (limited) return limited;
  const sp = req.nextUrl.searchParams;
  const brief = parseBriefParams(sp) ?? { product: "", buyers: [], verticals: [], geo: [], budgetCents: 0 };
  const limitRaw = Number(sp.get("limit") ?? 12);
  if (!Number.isFinite(limitRaw) || limitRaw < 1 || limitRaw > 40) return apiError(400, "invalid_limit", "limit must be a number between 1 and 40.");
  try {
    const { total, creators } = await getLineup(brief, Math.floor(limitRaw));
    return json({
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
    });
  } catch {
    return apiError(503, "unavailable", "The lineup is temporarily unavailable.");
  }
}
