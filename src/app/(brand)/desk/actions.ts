"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { asUser } from "@/lib/db";
import { toAppError, type AppError } from "@/lib/errors";

export interface CommitInput {
  brief: { product: string; buyers: string[]; verticals: string[]; geo: string[]; budgetCents: number };
  title: string;
  destinationUrl: string;
  objective: string;
  keyMessages: string;
  guidelines: string;
  publishBy: string | null;
  creatorIds: string[];
}
export type CommitResult = { ok: true; campaignId: string; count: number; totalCents: number } | { ok: false; error: AppError };
export type TopUpResult = { ok: true; walletCents: number } | { ok: false; error: AppError };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const signedOut: AppError = { code: "not_signed_in", message: "Your session ended. Sign in again to continue." };

/**
 * Create the campaign and place the hold in ONE transaction: if the hold fails (say, insufficient funds)
 * the campaign disappears with it, so a failed attempt leaves nothing behind. Prices never come from the client.
 */
export async function commitLineup(input: CommitInput): Promise<CommitResult> {
  const s = await getSession();
  if (!s || s.role !== "brand") return { ok: false, error: signedOut };
  const ids = Array.isArray(input.creatorIds) ? input.creatorIds : [];
  if (ids.length === 0) return { ok: false, error: toAppError({ message: "empty_lineup" }) };
  if (ids.length > 20) return { ok: false, error: toAppError({ message: "lineup_too_large" }) };
  if (!ids.every((x) => typeof x === "string" && UUID.test(x))) return { ok: false, error: toAppError({ message: "unknown_creator" }) };
  const budget = Math.min(Math.max(Math.floor(Number(input.brief?.budgetCents) || 0), 0), 100_000_000);

  try {
    const out = await asUser(s.accountId, async (c) => {
      const camp = await c.query<{ id: string }>("select create_campaign($1, $2::jsonb, $3, $4, $5, $6, $7, $8::date) as id", [
        String(input.title ?? ""),
        JSON.stringify({ ...input.brief, budgetCents: budget }),
        String(input.objective ?? "demos"),
        String(input.destinationUrl ?? ""),
        String(input.keyMessages ?? "").slice(0, 2000),
        String(input.guidelines ?? "").slice(0, 2000),
        budget,
        input.publishBy || null,
      ]);
      const campaignId = camp.rows[0]!.id;
      const hold = await c.query<{ r: { total_cents: number } }>("select place_hold($1, $2::uuid[]) as r", [campaignId, ids]);
      return { campaignId, totalCents: hold.rows[0]!.r.total_cents };
    });
    revalidatePath("/", "layout");
    return { ok: true, campaignId: out.campaignId, count: ids.length, totalCents: out.totalCents };
  } catch (e) {
    return { ok: false, error: toAppError(e) };
  }
}

export async function topUpAction(amountCents: number): Promise<TopUpResult> {
  const s = await getSession();
  if (!s || s.role !== "brand") return { ok: false, error: signedOut };
  try {
    const wallet = await asUser(s.accountId, async (c) => (await c.query<{ w: number }>("select top_up_wallet($1) as w", [Math.floor(amountCents)])).rows[0]!.w);
    revalidatePath("/", "layout");
    return { ok: true, walletCents: wallet };
  } catch (e) {
    return { ok: false, error: toAppError(e) };
  }
}
