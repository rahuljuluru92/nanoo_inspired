import { projectClicks } from "./projection";
import type { LineupCreator } from "./types";

/** A creator as the catalogue returns it (public columns only). */
export interface CatalogCreator {
  id: string;
  handle: string;
  name: string;
  headline: string;
  verticals: string[];
  followers: number;
  rateCents: number;
  audience: { roles: Record<string, number>; geo: Record<string, number> };
  impP25: number;
  impP50: number;
  impP75: number;
  /** median click-through rate, in percent (1.6 = 1.6%) */
  ctr: number;
  isSandbox: boolean;
  verified: boolean;
}

export interface FitBrief {
  buyers: string[];
  verticals: string[];
  geo: string[];
  budgetCents: number;
}

/** Audience 40% · vertical 25% · geography 20% · performance 15%. Sums to 1. */
export const WEIGHTS = { audience: 0.4, vertical: 0.25, geo: 0.2, performance: 0.15 } as const;
/** Half of your buyers in the audience earns full marks; more does not help. */
const FULL_MARKS_SHARE = 0.5;

export interface FitParts {
  audience: number;
  vertical: number;
  geo: number;
  performance: number;
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const pct = (x: number) => `${Math.round(x * 100)}%`;
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

/** Median click-through rate per vertical, across the catalogue: the yardstick for the performance factor. */
export function verticalMedians(creators: CatalogCreator[]): Record<string, number> {
  const by = new Map<string, number[]>();
  for (const c of creators) for (const v of c.verticals) by.set(v, [...(by.get(v) ?? []), c.ctr]);
  return Object.fromEntries([...by].map(([v, xs]) => [v, median(xs)]));
}

function yardstick(c: CatalogCreator, medians: Record<string, number>, all: number): number {
  const ms = c.verticals.map((v) => medians[v]).filter((m): m is number => typeof m === "number" && m > 0);
  return ms.length ? sum(ms) / ms.length : all;
}

export interface Scored {
  score: number;
  parts: FitParts;
  why: string[];
  /** CTR relative to the vertical median (1 = typical). */
  ctrRatio: number;
}

/**
 * Score one creator against a brief. Every facet the brief leaves empty is neutral (full marks), so an empty brief
 * ranks purely on performance. The "why" list names the strongest reasons in plain words — fit is never a black box.
 */
export function scoreCreator(c: CatalogCreator, brief: FitBrief, medians: Record<string, number>, overallMedian = 1): Scored {
  const roleShares = brief.buyers.map((b) => ({ tag: b, share: c.audience.roles[b] ?? 0 })).filter((r) => r.share > 0);
  const geoShares = brief.geo.map((g) => ({ tag: g, share: c.audience.geo[g] ?? 0 })).filter((r) => r.share > 0);
  const matchedVerticals = brief.verticals.filter((v) => c.verticals.includes(v));

  const audience = brief.buyers.length ? clamp01(sum(roleShares.map((r) => r.share)) / FULL_MARKS_SHARE) : 1;
  const vertical = brief.verticals.length ? matchedVerticals.length / brief.verticals.length : 1;
  const geo = brief.geo.length ? clamp01(sum(geoShares.map((r) => r.share)) / FULL_MARKS_SHARE) : 1;
  const ctrRatio = c.ctr / (yardstick(c, medians, overallMedian) || 1);
  const performance = clamp01((ctrRatio - 0.5) / 1.0);

  const parts: FitParts = { audience, vertical, geo, performance };
  const score = Math.round(100 * (WEIGHTS.audience * audience + WEIGHTS.vertical * vertical + WEIGHTS.geo * geo + WEIGHTS.performance * performance));

  const candidates: { weight: number; text: string }[] = [];
  if (roleShares.length) {
    const top = [...roleShares].sort((a, b) => b.share - a.share)[0]!;
    candidates.push({ weight: WEIGHTS.audience * audience, text: `${top.tag} ${pct(top.share)} of audience${roleShares.length > 1 ? ` +${roleShares.length - 1}` : ""}` });
  }
  if (matchedVerticals.length) candidates.push({ weight: WEIGHTS.vertical * vertical, text: matchedVerticals.join(" + ") });
  if (geoShares.length) {
    const top = [...geoShares].sort((a, b) => b.share - a.share)[0]!;
    candidates.push({ weight: WEIGHTS.geo * geo, text: `${top.tag} ${pct(top.share)}${geoShares.length > 1 ? ` +${geoShares.length - 1}` : ""}` });
  }
  if (ctrRatio >= 1.15) candidates.push({ weight: WEIGHTS.performance * performance, text: `CTR ${ctrRatio.toFixed(1)}× vertical median` });

  const why = candidates.sort((a, b) => b.weight - a.weight).slice(0, 3).map((x) => x.text);
  if (why.length === 0) why.push(`CTR ${c.ctr.toFixed(1)}%`);
  return { score, parts, why, ctrRatio };
}

/** Rank the whole catalogue for a brief: best fit first; ties go to the higher CTR, then the lower price. */
export function rankLineup(creators: CatalogCreator[], brief: FitBrief): LineupCreator[] {
  const medians = verticalMedians(creators);
  const overall = median(creators.map((c) => c.ctr));
  return creators
    .map((c) => {
      const s = scoreCreator(c, brief, medians, overall);
      return {
        row: {
          id: c.id,
          handle: c.handle,
          name: c.name,
          headline: c.headline,
          verticals: c.verticals,
          followers: c.followers,
          rateCents: c.rateCents,
          fit: s.score,
          why: s.why,
          projection: projectClicks(c.impP25, c.impP50, c.impP75, c.ctr),
          isSandbox: c.isSandbox,
        } satisfies LineupCreator,
        ctr: c.ctr,
      };
    })
    .sort((a, b) => b.row.fit - a.row.fit || b.ctr - a.ctr || a.row.rateCents - b.row.rateCents || a.row.handle.localeCompare(b.row.handle))
    .map((x) => x.row);
}
