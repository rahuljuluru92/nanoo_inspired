"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { authenticate, endSession, getSession, homeFor, safeNext, startSession, type Role } from "@/lib/auth";
import { asOwner, asUser } from "@/lib/db";
import { DEMO_BRAND_EMAIL, DEMO_CREATOR_EMAIL, DEMO_PASSWORD } from "@/lib/demo";
import { toAppError } from "@/lib/errors";
import { hashPassword } from "@/lib/password";
import { allow } from "@/lib/rate-limit";

export interface FormState {
  error?: string;
  values?: Record<string, string>;
}

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

async function clientKey(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "local").trim();
}

export async function loginAction(_prev: FormState, form: FormData): Promise<FormState> {
  const email = str(form, "email");
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password.", values: { email } };
  if (!allow(`login:${await clientKey()}:${email.toLowerCase()}`, 8, 10 * 60_000)) {
    return { error: "Too many attempts. Wait a few minutes and try again.", values: { email } };
  }
  const account = await authenticate(email, password);
  if (!account) return { error: "That email and password don’t match.", values: { email } };
  await startSession(account.id);
  redirect(safeNext(str(form, "next"), homeFor(account.role)));
}

/** One click into a shared demo account. The password is public by design (fictional data, resettable). `next` is honoured (same-site paths only). */
export async function demoLoginAction(role: Role, next: string): Promise<void> {
  if (!allow(`demo:${await clientKey()}`, 30, 10 * 60_000)) redirect("/login");
  const account = await authenticate(role === "brand" ? DEMO_BRAND_EMAIL : DEMO_CREATOR_EMAIL, DEMO_PASSWORD);
  if (!account) redirect("/login");
  await startSession(account.id);
  redirect(safeNext(next, homeFor(role)));
}

export async function logoutAction(): Promise<void> {
  await endSession();
  redirect("/");
}

/** Only demo accounts can reset; the RPC enforces that again in the database. */
export async function resetDemoAction(): Promise<void> {
  const s = await getSession();
  if (!s?.isDemo) return;
  await asUser(s.accountId, (c) => c.query("select reset_demo()"));
  revalidatePath("/", "layout");
}

export async function registerAction(_prev: FormState, form: FormData): Promise<FormState> {
  const role = str(form, "role") === "creator" ? "creator" : "brand";
  const values = { role, name: str(form, "name"), email: str(form, "email"), company: str(form, "company") };
  const password = String(form.get("password") ?? "");
  if (!values.name) return { error: "Enter your name.", values };
  if (role === "brand" && !values.company) return { error: "Enter your company name.", values };
  if (password.length < 8) return { error: "Choose a password of at least 8 characters.", values };
  if (!allow(`join:${await clientKey()}`, 10, 60 * 60_000)) return { error: "Too many sign-ups from this network. Try again later.", values };
  try {
    const id = await asOwner(async (c) => {
      const hash = await hashPassword(password);
      const r = await c.query<{ id: string }>("select create_account($1, $2, $3, $4, $5) as id", [values.email, hash, role, values.name, role === "brand" ? values.company : null]);
      return r.rows[0]!.id;
    });
    await startSession(id);
  } catch (e) {
    return { error: toAppError(e).message, values };
  }
  redirect(role === "brand" ? safeNext(str(form, "next"), "/desk") : "/onboarding");
}
