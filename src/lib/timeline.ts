/** How a booking's events read to the creator ("You accepted"), and to the brand ("Maya accepted"). */
export function creatorEventLabel(kind: string, note: string | null, meta: Record<string, unknown>): string {
  switch (kind) {
    case "offer_sent":
      return "Offer received";
    case "offer_accepted":
      return "You accepted";
    case "offer_declined":
      return "You declined";
    case "draft_submitted":
      return `You submitted a draft${typeof meta.version === "number" ? ` (version ${meta.version})` : ""}`;
    case "changes_requested":
      return note ? `Changes requested: ${note}` : "Changes requested";
    case "draft_approved":
      return "Draft approved";
    case "went_live":
      return "You went live";
    case "stats_reported":
      return typeof meta.impressions === "number" ? `Stats reported: ${meta.impressions.toLocaleString("en-IE")} impressions` : "Stats reported";
    case "payout_released":
      return typeof meta.amount_cents === "number" ? `Payout released: €${Math.round(meta.amount_cents / 100).toLocaleString("en-IE")}` : "Payout released";
    case "cancelled":
      return "The brand cancelled this offer";
    default:
      return kind.replace(/_/g, " ");
  }
}

export function brandEventLabel(kind: string, name: string, note: string | null, meta: Record<string, unknown>): string {
  switch (kind) {
    case "offer_sent":
      return "You sent the offer";
    case "offer_accepted":
      return `${name} accepted`;
    case "offer_declined":
      return `${name} declined${note ? `: ${note}` : ""}`;
    case "draft_submitted":
      return `${name} submitted a draft${typeof meta.version === "number" ? ` (version ${meta.version})` : ""}`;
    case "changes_requested":
      return note ? `You asked for changes: ${note}` : "You asked for changes";
    case "draft_approved":
      return "You approved the draft";
    case "went_live":
      return `${name} went live`;
    case "stats_reported":
      return typeof meta.impressions === "number" ? `${name} reported ${meta.impressions.toLocaleString("en-IE")} impressions` : `${name} reported stats`;
    case "payout_released":
      return typeof meta.amount_cents === "number" ? `You released €${Math.round(meta.amount_cents / 100).toLocaleString("en-IE")}` : "You released the payout";
    case "cancelled":
      return "You cancelled the offer";
    default:
      return kind.replace(/_/g, " ");
  }
}
