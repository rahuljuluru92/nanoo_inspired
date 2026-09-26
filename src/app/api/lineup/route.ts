import type { NextRequest } from "next/server";
import { apiError, json, preflight, throttle } from "@/lib/api";
import { lineupBody } from "@/lib/api-shapes";
import { parseBriefParams } from "@/lib/brief-params";
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
    return json(lineupBody(brief, total, creators));
  } catch {
    return apiError(503, "unavailable", "The lineup is temporarily unavailable.");
  }
}
