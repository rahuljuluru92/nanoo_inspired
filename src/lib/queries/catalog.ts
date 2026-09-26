import "server-only";
import type { PoolClient } from "pg";
import type { CatalogCreator } from "@/lib/fit";

interface CreatorRow {
  id: string;
  handle: string;
  display_name: string;
  headline: string;
  verticals: string[];
  followers: number;
  rate_cents: number;
  audience: { roles?: Record<string, number>; geo?: Record<string, number> };
  imp_p25: number;
  imp_p50: number;
  imp_p75: number;
  ctr_p50: string; // numeric arrives as a string
  is_sandbox: boolean;
  verified: boolean;
}

export const toCatalog = (r: CreatorRow): CatalogCreator => ({
  id: r.id,
  handle: r.handle,
  name: r.display_name,
  headline: r.headline,
  verticals: r.verticals,
  followers: r.followers,
  rateCents: r.rate_cents,
  audience: { roles: r.audience.roles ?? {}, geo: r.audience.geo ?? {} },
  impP25: r.imp_p25,
  impP50: r.imp_p50,
  impP75: r.imp_p75,
  ctr: Number(r.ctr_p50),
  isSandbox: r.is_sandbox,
  verified: r.verified,
});

/** The public catalogue: every creator's public columns. Works for a signed-in user or a visitor (it reads the public view). */
export async function loadCatalog(c: PoolClient): Promise<CatalogCreator[]> {
  const { rows } = await c.query<CreatorRow>(
    `select id, handle, display_name, headline, verticals, followers, rate_cents, audience,
            imp_p25, imp_p50, imp_p75, ctr_p50, is_sandbox, verified
       from public_creators`,
  );
  return rows.map(toCatalog);
}
