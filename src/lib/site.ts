/**
 * The public address of this deployment, without a trailing slash. Set NEXT_PUBLIC_SITE_URL to use a custom domain; otherwise Vercel's
 * own production hostname is used, and locally it falls back to http://localhost:3000.
 */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  return vercel ? `https://${vercel}` : "http://localhost:3000";
}
