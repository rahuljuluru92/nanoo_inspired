import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { asOwner } from "./db";
import { verifyPassword } from "./password";

const COOKIE = "byline_session";
const DAYS = 30;
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export type Role = "brand" | "creator";
export interface Session {
  accountId: string;
  role: Role;
  displayName: string;
  email: string;
  isDemo: boolean;
}

export const homeFor = (role: Role) => (role === "brand" ? "/desk" : "/offers");

/** Only same-site relative paths are honoured after sign-in (no open redirects). */
export function safeNext(next: string | null | undefined, fallback: string): string {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.includes("\\") ? next : fallback;
}

/** Create a session: the random token goes in an HttpOnly cookie; only its hash is stored. */
export async function startSession(accountId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  await asOwner((c) =>
    c.query("insert into sessions (id, account_id, expires_at) values ($1, $2, now() + make_interval(days => $3))", [sha256(token), accountId, DAYS]),
  );
  (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * DAYS });
}

export async function endSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await asOwner((c) => c.query("delete from sessions where id = $1", [sha256(token)]));
  jar.delete(COOKIE);
}

/** Cached per request. Returns null when signed out or expired. */
export const getSession = cache(async (): Promise<Session | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const { rows } = await asOwner((c) =>
    c.query<{ id: string; role: Role; display_name: string; email: string; is_demo: boolean }>(
      `select a.id, a.role, a.display_name, a.email, a.is_demo
         from sessions s join accounts a on a.id = s.account_id
        where s.id = $1 and s.expires_at > now()`,
      [sha256(token)],
    ),
  );
  const a = rows[0];
  return a ? { accountId: a.id, role: a.role, displayName: a.display_name, email: a.email, isDemo: a.is_demo } : null;
});

/** Gate for role-specific route groups. Signed out → /login (with a way back); wrong role → their own home. */
export async function requireRole(role: Role, here: string): Promise<Session> {
  const s = await getSession();
  if (!s) redirect(`/login?next=${encodeURIComponent(here)}`);
  if (s.role !== role) redirect(homeFor(s.role));
  return s;
}

const DUMMY = "scrypt$16384$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

/** Verify credentials. Always does the same amount of hashing work, so timing does not reveal which emails exist. */
export async function authenticate(email: string, password: string): Promise<{ id: string; role: Role } | null> {
  const { rows } = await asOwner((c) => c.query<{ id: string; role: Role; password_hash: string }>("select id, role, password_hash from accounts where email = $1", [email.trim().toLowerCase()]));
  const a = rows[0];
  const ok = await verifyPassword(password, a?.password_hash ?? DUMMY);
  return a && ok ? { id: a.id, role: a.role } : null;
}
