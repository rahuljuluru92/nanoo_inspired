import type { Projection } from "./types";

/**
 * What a creator's next post should deliver, from their own history: impressions at the 25th / 50th / 75th
 * percentile times their median click-through rate (a percentage). A range, never a promise.
 */
export function projectClicks(impP25: number, impP50: number, impP75: number, ctrPercent: number): Projection {
  const at = (imp: number) => Math.round((imp * ctrPercent) / 100);
  const low = at(impP25);
  const mid = Math.max(low, at(impP50));
  const high = Math.max(mid, at(impP75));
  return { low, mid, high };
}
