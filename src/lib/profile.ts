/** Creator profile rules, shared by the form (instant feedback) and the server action (authority). The database checks again. */
export interface ProfileInput {
  displayName: string;
  handle: string;
  headline: string;
  bio: string;
  country: string;
  verticals: string[];
  followers: number;
  /** euros per post */
  rateEuros: number;
  /** optional; blank means "estimate from followers" */
  typicalImpressions: number | null;
  /** shares 0..1 keyed by buyer role / country */
  roles: Record<string, number>;
  geo: Record<string, number>;
}

export type ProfileErrors = Partial<Record<"displayName" | "handle" | "headline" | "bio" | "country" | "verticals" | "followers" | "rate" | "impressions", string>>;

export const MIN_RATE_EUROS = 20;
export const MAX_RATE_EUROS = 5000;

/** "Maya Okafor" → "maya-okafor" (accents folded, junk removed). */
export function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function validateProfile(p: ProfileInput): ProfileErrors {
  const e: ProfileErrors = {};
  if (p.displayName.trim().length < 1 || p.displayName.trim().length > 80) e.displayName = "Enter your name (up to 80 characters).";
  if (!/^[a-z0-9-]{3,40}$/.test(p.handle)) e.handle = "3 to 40 characters: lowercase letters, numbers and hyphens.";
  const h = p.headline.trim().length;
  if (h < 5 || h > 120) e.headline = "Describe what you write about in 5 to 120 characters.";
  if (p.bio.length > 600) e.bio = "Keep the bio under 600 characters.";
  if (!p.country) e.country = "Pick your main audience country.";
  if (p.verticals.length < 1 || p.verticals.length > 3) e.verticals = "Pick one to three verticals.";
  if (!Number.isFinite(p.followers) || p.followers < 0 || p.followers > 50_000_000) e.followers = "Enter your follower count.";
  if (!Number.isFinite(p.rateEuros) || p.rateEuros < MIN_RATE_EUROS || p.rateEuros > MAX_RATE_EUROS) e.rate = `Your rate per post is between €${MIN_RATE_EUROS} and €${MAX_RATE_EUROS.toLocaleString("en-IE")}.`;
  if (p.typicalImpressions !== null && (!Number.isFinite(p.typicalImpressions) || p.typicalImpressions < 0)) e.impressions = "Enter a number, or leave it blank.";
  return e;
}

/** Sliders work in whole percent; the database stores shares between 0 and 1. */
export function mixToShares(rows: { tag: string; pct: number }[]): Record<string, number> {
  return Object.fromEntries(rows.filter((r) => r.pct > 0).map((r) => [r.tag, Math.round(Math.max(0, Math.min(100, r.pct))) / 100]));
}

export function sharesToMix(shares: Record<string, number> | undefined): { tag: string; pct: number }[] {
  return Object.entries(shares ?? {})
    .map(([tag, s]) => ({ tag, pct: Math.round(s * 100) }))
    .sort((a, b) => b.pct - a.pct);
}
