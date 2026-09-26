"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { asUser } from "@/lib/db";
import { toAppError, type AppError } from "@/lib/errors";

export type ActionResult = { ok: true } | { ok: false; error: AppError };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Run one RPC as the signed-in creator. Errors become safe, human messages; nothing raw leaks. */
async function run(bookingId: string, sql: string, params: unknown[], refresh = true): Promise<ActionResult> {
  const s = await getSession();
  if (!s || s.role !== "creator") return { ok: false, error: { code: "not_signed_in", message: "Your session ended. Sign in again to continue." } };
  if (!UUID.test(bookingId)) return { ok: false, error: { code: "forbidden", message: "You can’t do that on this booking." } };
  try {
    await asUser(s.accountId, (c) => c.query(sql, [bookingId, ...params]));
    if (refresh) revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: toAppError(e) };
  }
}

export async function acceptOfferAction(id: string): Promise<ActionResult> {
  return run(id, "select accept_offer($1)", []);
}
export async function declineOfferAction(id: string, reason: string): Promise<ActionResult> {
  return run(id, "select decline_offer($1, $2)", [reason.trim().slice(0, 300) || null]);
}
/** Autosave: quiet on purpose (no revalidation) so typing is never interrupted. */
export async function saveDraftAction(id: string, text: string): Promise<ActionResult> {
  return run(id, "select save_draft($1, $2)", [text.slice(0, 5000)], false);
}
export async function submitDraftAction(id: string, text: string): Promise<ActionResult> {
  return run(id, "select submit_draft($1, $2)", [text.slice(0, 5000)]);
}
export async function markLiveAction(id: string, url: string): Promise<ActionResult> {
  return run(id, "select mark_live($1, $2)", [url.trim()]);
}
export async function reportStatsAction(id: string, impressions: number, reactions: number, comments: number): Promise<ActionResult> {
  return run(id, "select report_stats($1, $2, $3, $4)", [Math.floor(impressions), Math.floor(reactions || 0), Math.floor(comments || 0)]);
}
