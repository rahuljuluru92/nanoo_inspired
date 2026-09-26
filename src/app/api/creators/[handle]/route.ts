import type { NextRequest } from "next/server";
import { apiError, json, preflight, throttle } from "@/lib/api";
import { kitBody } from "@/lib/api-shapes";
import { loadKit } from "@/lib/queries/kit";

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
    return json(kitBody(kit, posts, receipts));
  } catch {
    return apiError(503, "unavailable", "The kit is temporarily unavailable.");
  }
}
