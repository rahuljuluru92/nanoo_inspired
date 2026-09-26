import { formatEUR } from "./money";

interface PgLike {
  code?: string;
  message?: string;
  detail?: string;
  hint?: string;
}

/** What the UI can show. `code` is stable; `message` is human. */
export interface AppError {
  code: string;
  message: string;
}

const MESSAGES: Record<string, string> = {
  not_signed_in: "Your session ended. Sign in again to continue.",
  not_a_brand: "That action is for brand accounts.",
  not_a_creator: "That action is for creator accounts.",
  forbidden: "You can’t do that on this booking.",
  empty_lineup: "Add at least one creator to the tray first.",
  lineup_too_large: "A single hold can include up to 20 creators.",
  unknown_creator: "One of those creators is no longer available. Refresh the lineup and try again.",
  already_booked: "You already sent an offer to one of these creators for this campaign.",
  campaign_not_found: "That campaign couldn’t be found.",
  campaign_closed: "That campaign is closed.",
  invalid_title: "Give the campaign a title of 3 to 80 characters.",
  invalid_url: "Enter a full link, starting with https://",
  invalid_amount: "Test top-ups are between €10 and €50,000.",
  invalid_state: "That booking has already moved on. Refresh to see where it is.",
  draft_too_short: "A draft needs at least 20 characters.",
  note_required: "Say what should change (at least 5 characters).",
  email_taken: "That email already has an account. Sign in instead.",
  invalid_email: "Enter a valid email address.",
  company_required: "Enter your company name.",
};

/** Turn a Postgres error raised by one of our RPCs into something safe to show. Unknown errors never leak details. */
export function toAppError(e: unknown): AppError {
  const err = e as PgLike;
  const code = err?.message ?? "";
  if (code === "insufficient_funds") {
    const short = Number(err.hint);
    return { code, message: Number.isFinite(short) ? `Your wallet is ${formatEUR(short)} short. Add test funds to place this hold.` : "Your wallet is short. Add test funds to place this hold." };
  }
  if (code in MESSAGES) return { code, message: MESSAGES[code]! };
  return { code: "unexpected", message: "Something went wrong on our side. Nothing was changed. Try again in a moment." };
}
