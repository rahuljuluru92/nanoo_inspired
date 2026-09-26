import { createHash } from "node:crypto";

export type UaClass = "human" | "bot" | "preview";

/** Link unfurlers fetch a URL to render a card when it is posted; they are not readers, so they never count. */
const PREVIEW = /(linkedinbot|slackbot|slack-imgproxy|facebookexternalhit|twitterbot|whatsapp|telegrambot|discordbot|skypeuripreview|embedly|redditbot|pinterest|vkshare|quora link preview)/i;
const BOT = /(bot\b|crawler|spider|crawling|headless|phantomjs|lighthouse|pingdom|uptimerobot|statuscake|curl\/|wget\/|python-requests|python-urllib|go-http-client|okhttp|libwww|httpclient|scrapy|node-fetch|axios|postman|monitor)/i;

/** Only "human" clicks are counted on a Receipt. A missing user agent is never a person. */
export function classifyUserAgent(ua: string | null | undefined): UaClass {
  if (!ua) return "bot";
  if (PREVIEW.test(ua)) return "preview";
  if (BOT.test(ua)) return "bot";
  return "human";
}

/**
 * Privacy-preserving visitor id: sha256(ip | user agent | UTC day | secret). The raw IP is never stored, and because the day is
 * part of the hash the same person is "unique" once per day and cannot be followed across days.
 */
export function visitorHash(ip: string, ua: string, day: string, secret: string): string {
  return createHash("sha256").update(`${ip}|${ua}|${day}|${secret}`).digest("hex").slice(0, 32);
}

export function slug(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** The brand's link plus UTM parameters, so their own analytics attributes the visit to the creator. Existing params win. */
export function buildDestination(url: string, campaignTitle: string, creatorHandle: string): string {
  const u = new URL(url);
  const add = (k: string, v: string) => {
    if (!u.searchParams.has(k)) u.searchParams.set(k, v);
  };
  add("utm_source", "byline");
  add("utm_medium", "creator");
  add("utm_campaign", slug(campaignTitle) || "campaign");
  add("utm_content", creatorHandle);
  return u.toString();
}

/** Referrers are stored as a host only ("linkedin.com"), never a full URL. */
export function refererHost(referer: string | null | undefined): string {
  if (!referer) return "";
  try {
    return new URL(referer).hostname.replace(/^www\./, "").slice(0, 100);
  } catch {
    return "";
  }
}

export function clientIp(h: { get(name: string): string | null }): string {
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "0.0.0.0").trim();
}

/** A tracking code is 8 characters from an unambiguous alphabet (no 0, 1, i, l, o). */
export const CODE_RE = /^[2-9a-hjkmnp-z]{8}$/;
