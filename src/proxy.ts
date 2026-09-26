import { NextResponse, type NextRequest } from "next/server";

/**
 * Tells server components which URL was actually requested (they cannot see it otherwise), so a signed-out visitor who opens a
 * deep link, such as a campaign from a notification, is returned to that exact page after signing in, not to the area's front door.
 */
export function proxy(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.searchParams.delete("_rsc");
  const headers = new Headers(req.headers);
  headers.set("x-byline-here", url.pathname + url.search);
  return NextResponse.next({ request: { headers } });
}

export const config = { matcher: ["/((?!_next/|api/|go/|receipt/|c/|.*\\..*).*)"] };
