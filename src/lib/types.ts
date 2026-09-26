export type BookingStatus =
  | "invited"
  | "accepted"
  | "declined"
  | "drafted"
  | "changes_requested"
  | "approved"
  | "live"
  | "paid"
  | "cancelled";

export type WireKind =
  | "hold_placed"
  | "offer_sent"
  | "offer_accepted"
  | "offer_declined"
  | "draft_submitted"
  | "changes_requested"
  | "draft_approved"
  | "went_live"
  | "click"
  | "stats_reported"
  | "payout_released"
  | "cancelled";

export interface WireEvent {
  id: string;
  /** ISO timestamp */
  at: string;
  kind: WireKind;
  /** Already-rendered sentence, e.g. "Maya Okafor accepted · Launch Q4" */
  text: string;
}

export interface Projection {
  low: number;
  mid: number;
  high: number;
}

export interface LineupCreator {
  handle: string;
  name: string;
  headline: string;
  verticals: string[];
  followers: number;
  rateCents: number;
  /** 0–100 */
  fit: number;
  /** Human reasons behind the score, e.g. "CTOs 61% of audience" */
  why: string[];
  projection: Projection;
  isSandbox?: boolean;
}

export interface BriefValue {
  product: string;
  buyers: string[];
  verticals: string[];
  geo: string[];
  budgetCents: number;
}
