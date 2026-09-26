import { NextResponse } from "next/server";
import { allow } from "./rate-limit";
import { clientIp } from "./tracking";

/** Shared behaviour of the public, read-only API: CORS open, cacheable, throttled per IP, errors as JSON. */
const BASE = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
};

export function json(body: unknown, init: { status?: number; cache?: boolean } = {}) {
  const cache = init.cache === false ? "no-store" : "public, s-maxage=30, stale-while-revalidate=120";
  return NextResponse.json(body, { status: init.status ?? 200, headers: { ...BASE, "cache-control": cache } });
}

export function apiError(status: number, code: string, message: string) {
  return json({ error: { code, message } }, { status, cache: false });
}

/** Returns a 429 response when this client is over its limit, otherwise null. */
export function throttle(req: Request, bucket: string, perMinute = 60): NextResponse | null {
  const ip = clientIp(req.headers);
  return allow(`api:${bucket}:${ip}`, perMinute, 60_000) ? null : apiError(429, "rate_limited", `Too many requests. The limit is ${perMinute} per minute.`);
}

export const preflight = () => new NextResponse(null, { status: 204, headers: { ...BASE, "access-control-allow-headers": "content-type", "access-control-max-age": "86400" } });
