import { describe, expect, it } from "vitest";
import { brandEventLabel, creatorEventLabel } from "./timeline";

describe("timeline labels", () => {
  it("speaks to the creator in the second person", () => {
    expect(creatorEventLabel("offer_accepted", null, {})).toBe("You accepted");
    expect(creatorEventLabel("draft_submitted", null, { version: 2 })).toBe("You submitted a draft (version 2)");
    expect(creatorEventLabel("changes_requested", "Shorten the intro.", {})).toBe("Changes requested: Shorten the intro.");
    expect(creatorEventLabel("payout_released", null, { amount_cents: 90000 })).toBe("Payout released: €900");
  });

  it("names the creator for the brand and keeps the brand's own actions in the second person", () => {
    expect(brandEventLabel("offer_accepted", "Maya", null, {})).toBe("Maya accepted");
    expect(brandEventLabel("offer_declined", "Maya", "Not a fit", {})).toBe("Maya declined: Not a fit");
    expect(brandEventLabel("draft_approved", "Maya", null, {})).toBe("You approved the draft");
  });

  it("falls back to a readable label for unknown kinds", () => {
    expect(creatorEventLabel("some_new_kind", null, {})).toBe("some new kind");
  });
});
