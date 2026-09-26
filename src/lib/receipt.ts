/** A short, stable "post number" for a Receipt, derived from its tracking code (cosmetic; the code is the identity). */
export function receiptNumber(code: string): string {
  let h = 0;
  for (const ch of code) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return String(h % 10000).padStart(4, "0");
}
