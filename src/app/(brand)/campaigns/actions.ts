"use server";

import { runBookingRpc, type ActionResult } from "@/lib/rpc-action";

export async function approveDraftAction(id: string): Promise<ActionResult> {
  return runBookingRpc("brand", id, "select approve_draft($1)");
}
export async function requestChangesAction(id: string, note: string): Promise<ActionResult> {
  return runBookingRpc("brand", id, "select request_changes($1, $2)", [note.trim().slice(0, 500)]);
}
export async function cancelBookingAction(id: string): Promise<ActionResult> {
  return runBookingRpc("brand", id, "select cancel_booking($1)");
}
export async function releasePayoutAction(id: string): Promise<ActionResult> {
  return runBookingRpc("brand", id, "select release_payout($1)");
}
export async function setReceiptPublicAction(id: string, isPublic: boolean): Promise<ActionResult> {
  return runBookingRpc("brand", id, "select set_receipt_public($1, $2)", [isPublic]);
}
