import "server-only";
import { asAnon } from "@/lib/db";
import { rankLineup } from "@/lib/fit";
import { loadCatalog } from "@/lib/queries/catalog";
import type { BriefValue, LineupCreator } from "@/lib/types";

export interface LineupResult {
  total: number;
  creators: LineupCreator[];
}

/** The ranked lineup for a brief, computed on the server from the public catalogue. Used by the API and the landing page. */
export async function getLineup(brief: BriefValue, limit = 12): Promise<LineupResult> {
  const catalogue = await asAnon(loadCatalog);
  const ranked = rankLineup(catalogue, brief);
  return { total: ranked.length, creators: ranked.slice(0, Math.max(1, Math.min(limit, ranked.length || 1))) };
}
