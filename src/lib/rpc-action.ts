import "server-only";
import { revalidatePath } from "next/cache";
import { getSession, type Role } from "./auth";
import { asUser } from "./db";
import { toAppError, type AppError } from "./errors";

export type ActionResult = { ok: true } | { ok: false; error: AppError };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Run ONE RPC as the signed-in user, for a booking id. The database decides who may do what; this only makes sure the
 * caller has the right kind of account, the id is well-formed, and any failure becomes a safe human message.
 */
export async function runBookingRpc(role: Role, bookingId: string, sql: string, params: unknown[] = [], refresh = true): Promise<ActionResult> {
  const s = await getSession();
  if (!s || s.role !== role) return { ok: false, error: { code: "not_signed_in", message: "Your session ended. Sign in again to continue." } };
  if (!UUID.test(bookingId)) return { ok: false, error: { code: "forbidden", message: "You can’t do that on this booking." } };
  try {
    await asUser(s.accountId, (c) => c.query(sql, [bookingId, ...params]));
    if (refresh) revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: toAppError(e) };
  }
}
