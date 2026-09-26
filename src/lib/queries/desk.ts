import "server-only";
import { asUser } from "@/lib/db";
import { loadCatalog } from "./catalog";

/** Everything the Desk needs in one round trip, as the signed-in brand (RLS applies). */
export async function loadDesk(userId: string) {
  return asUser(userId, async (c) => {
    const creators = await loadCatalog(c);
    const brand = await c.query<{ wallet_cents: number; campaigns: string }>(
      "select b.wallet_cents, (select count(*) from campaigns) as campaigns from brands b",
    );
    return {
      creators,
      walletCents: brand.rows[0]?.wallet_cents ?? 0,
      briefNumber: Number(brand.rows[0]?.campaigns ?? 0) + 1,
    };
  });
}
