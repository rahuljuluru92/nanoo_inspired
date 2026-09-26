import { after, NextResponse, type NextRequest } from "next/server";
import { notFound } from "next/navigation";
import { asOwner } from "@/lib/db";
import { allow } from "@/lib/rate-limit";
import { CODE_RE, buildDestination, classifyUserAgent, clientIp, refererHost, visitorHash } from "@/lib/tracking";

export const dynamic = "force-dynamic";

interface Link {
  booking_id: string;
  destination_url: string;
  campaign_title: string;
  handle: string;
}

const NO_STORE = { "cache-control": "no-store" };

async function lookup(code: string): Promise<Link | null> {
  if (!CODE_RE.test(code)) return null;
  const { rows } = await asOwner((c) => c.query<{ l: Link | null }>("select link_lookup($1) as l", [code]));
  return rows[0]?.l ?? null;
}

/**
 * The tracked link. It answers with the redirect FIRST and records the click afterwards (`after`), so the reader never waits on
 * our database. Crawlers and link previews are recorded but flagged, prefetches and HEAD requests are not recorded at all.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const link = await lookup(code);
  if (!link) notFound();

  const dest = buildDestination(link.destination_url, link.campaign_title, link.handle);
  const h = req.headers;
  const prefetch = /prefetch|prerender/i.test(`${h.get("sec-purpose") ?? ""} ${h.get("purpose") ?? ""}`);
  const ip = clientIp(h);

  if (!prefetch && allow(`go:${ip}`, 240, 60_000)) {
    const ua = h.get("user-agent") ?? "";
    const day = new Date().toISOString().slice(0, 10);
    const hash = visitorHash(ip, ua, day, process.env.CLICK_HASH_SECRET ?? "unset-dev-secret");
    const country = h.get("x-vercel-ip-country") ?? "XX";
    const referrer = refererHost(h.get("referer"));
    after(async () => {
      try {
        await asOwner((c) => c.query("select record_click($1, $2, $3, $4, $5)", [link.booking_id, hash, classifyUserAgent(ua), country, referrer]));
      } catch (e) {
        console.error("record_click failed", (e as Error).message);
      }
    });
  }
  return NextResponse.redirect(dest, { status: 302, headers: NO_STORE });
}

/** Link checkers use HEAD: follow the redirect, count nothing. */
export async function HEAD(_req: NextRequest, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const link = await lookup(code);
  if (!link) notFound();
  return NextResponse.redirect(buildDestination(link.destination_url, link.campaign_title, link.handle), { status: 302, headers: NO_STORE });
}
