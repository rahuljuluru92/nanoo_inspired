import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

/** Public marketing pages, kits and the API docs are indexable; the app itself and Receipts are not. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: ["/", "/developers", "/c/"], disallow: ["/desk", "/campaigns", "/wallet", "/wire", "/offers", "/deals", "/earnings", "/kit", "/onboarding", "/receipt/", "/go/", "/api/", "/styleguide"] }],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
