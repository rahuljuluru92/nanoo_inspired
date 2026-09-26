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

/**
 * A reader following a tracked link must never see a stack trace. If we cannot look the link up (database down),
 * say so plainly, tell clients when to retry, and let the browser cache nothing.
 */
function unavailable() {
  const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Try again in a moment</title>
<body style="margin:0;min-height:100dvh;display:grid;place-items:center;background:#f5f1ea;color:#15130f;font-family:Georgia,serif"><main style="max-width:28rem;padding:1.5rem"><h1 style="font-weight:400;font-size:2rem;margin:0 0 .5rem">Try again in a moment.</h1><p style="line-height:1.5;margin:0">This link is temporarily unavailable. It hasn't been lost: reload the page in a few seconds.</p></main></body></html>`;
  return new NextResponse(html, { status: 503, headers: { "content-type": "text/html; charset=utf-8", "retry-after": "30", ...NO_STORE } });
}

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
  let link: Link | null;
  try {
    link = await lookup(code);
  } catch {
    return unavailable();
  }
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
  let link: Link | null;
  try {
    link = await lookup(code);
  } catch {
    return unavailable();
  }
  if (!link) notFound();
  return NextResponse.redirect(buildDestination(link.destination_url, link.campaign_title, link.handle), { status: 302, headers: NO_STORE });
}
