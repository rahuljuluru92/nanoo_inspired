/** The vocabulary shared by the seed data, the brief sentence and the fit score. */
export const BUYERS = ["CTOs", "Security leads", "Founders", "RevOps", "Sales leaders", "HR leaders", "Product managers", "Marketing leaders"] as const;
export const VERTICALS = ["Fintech", "Devtools", "Security", "Sales-tech", "HR-tech", "Martech", "Data & AI", "Product", "Legal-tech"] as const;
export const GEOS = ["France", "Germany", "UK", "Netherlands", "Spain", "US", "Nordics"] as const;

export const OPTIONS = { buyers: [...BUYERS], verticals: [...VERTICALS], geo: [...GEOS] };

/** Keep only values that exist in the taxonomy (used for URL-supplied briefs). */
export function only<T extends string>(values: string[], allowed: readonly T[]): T[] {
  return values.filter((v): v is T => (allowed as readonly string[]).includes(v));
}
