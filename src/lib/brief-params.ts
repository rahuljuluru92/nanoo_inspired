import { BUYERS, GEOS, VERTICALS, only } from "./taxonomy";
import type { BriefValue } from "./types";

type Source = URLSearchParams | Record<string, string | string[] | undefined>;

const one = (s: Source, k: string): string => {
  const v = s instanceof URLSearchParams ? s.get(k) : s[k];
  return (Array.isArray(v) ? v[0] : v) ?? "";
};
const list = (s: Source, k: string): string[] => one(s, k).split(",").map((x) => x.trim()).filter(Boolean);
const KEYS = ["product", "buyers", "verticals", "geo", "budget"];
const MAX_BUDGET_EUROS = 1_000_000;

/**
 * A brief carried in a URL (the landing page hands it to the desk; the public API takes the same parameters).
 * Anything outside the taxonomy is dropped, lengths and amounts are capped. Returns null when no brief parameter is present.
 * Budget is in whole euros.
 */
export function parseBriefParams(source: Source): BriefValue | null {
  const present = KEYS.some((k) => (source instanceof URLSearchParams ? source.has(k) : source[k] !== undefined));
  if (!present) return null;
  const budget = Number(one(source, "budget"));
  return {
    product: one(source, "product").slice(0, 80),
    buyers: only(list(source, "buyers"), BUYERS),
    verticals: only(list(source, "verticals"), VERTICALS),
    geo: only(list(source, "geo"), GEOS),
    budgetCents: Number.isFinite(budget) && budget > 0 ? Math.min(Math.round(budget), MAX_BUDGET_EUROS) * 100 : 0,
  };
}

/** The inverse: a query string (no leading "?"). Empty facets are omitted. */
export function briefToParams(b: BriefValue): string {
  const p = new URLSearchParams();
  if (b.product.trim()) p.set("product", b.product.trim().slice(0, 80));
  if (b.buyers.length) p.set("buyers", b.buyers.join(","));
  if (b.verticals.length) p.set("verticals", b.verticals.join(","));
  if (b.geo.length) p.set("geo", b.geo.join(","));
  if (b.budgetCents > 0) p.set("budget", String(Math.round(b.budgetCents / 100)));
  return p.toString();
}
