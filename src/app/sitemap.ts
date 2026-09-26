import type { MetadataRoute } from "next";
import { asAnon } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  let handles: string[] = [];
  try {
    handles = (await asAnon((c) => c.query<{ handle: string }>("select handle from public_creators order by handle"))).rows.map((r) => r.handle);
  } catch {
    // the sitemap must never fail the build or the request
  }
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/developers`, changeFrequency: "monthly", priority: 0.5 },
    ...handles.map((h) => ({ url: `${base}/c/${h}`, changeFrequency: "weekly" as const, priority: 0.4 })),
  ];
}
