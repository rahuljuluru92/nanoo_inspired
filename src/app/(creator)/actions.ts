"use server";

import { runBookingRpc, type ActionResult } from "@/lib/rpc-action";

export type { ActionResult };

export async function acceptOfferAction(id: string): Promise<ActionResult> {
  return runBookingRpc("creator", id, "select accept_offer($1)");
}
export async function declineOfferAction(id: string, reason: string): Promise<ActionResult> {
  return runBookingRpc("creator", id, "select decline_offer($1, $2)", [reason.trim().slice(0, 300) || null]);
}
/** Autosave: quiet on purpose (no revalidation) so typing is never interrupted. */
export async function saveDraftAction(id: string, text: string): Promise<ActionResult> {
  return runBookingRpc("creator", id, "select save_draft($1, $2)", [text.slice(0, 5000)], false);
}
export async function submitDraftAction(id: string, text: string): Promise<ActionResult> {
  return runBookingRpc("creator", id, "select submit_draft($1, $2)", [text.slice(0, 5000)]);
}
export async function markLiveAction(id: string, url: string): Promise<ActionResult> {
  return runBookingRpc("creator", id, "select mark_live($1, $2)", [url.trim()]);
}
export async function reportStatsAction(id: string, impressions: number, reactions: number, comments: number): Promise<ActionResult> {
  return runBookingRpc("creator", id, "select report_stats($1, $2, $3, $4)", [Math.floor(impressions), Math.floor(reactions || 0), Math.floor(comments || 0)]);
}
