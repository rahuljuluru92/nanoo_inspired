const eur = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const eur2 = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Integer cents → "€1,400" (or "€2.29" when there are cents). Money is never a float in storage; this is display only. */
export function formatEUR(cents: number): string {
  return cents % 100 === 0 ? eur.format(cents / 100) : eur2.format(cents / 100);
}

/** Always two decimals — for cost per click. */
export function formatEUR2(cents: number): string {
  return eur2.format(cents / 100);
}

/** 520 → "520", 1900 → "1.9k", 1_200_000 → "1.2M". */
export function formatCount(n: number): string {
  const v = Math.round(n);
  if (v < 1000) return String(v);
  if (v < 1_000_000) return `${trim(v / 1000)}k`;
  return `${trim(v / 1_000_000)}M`;
}

function trim(x: number): string {
  return (Math.round(x * 10) / 10).toFixed(1).replace(/\.0$/, "");
}

/** "520–900" or "1.6k–2.7k". */
export function formatRange(low: number, high: number): string {
  return `${formatCount(low)}–${formatCount(high)}`;
}

/** Cost per click in cents, or null when there is nothing to divide by. */
export function costPerClickCents(totalCents: number, clicks: number): number | null {
  return clicks > 0 ? Math.round(totalCents / clicks) : null;
}
