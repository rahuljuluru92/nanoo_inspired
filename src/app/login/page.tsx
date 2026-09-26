import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Wordmark } from "@/components/art/wordmark";
import { Dateline } from "@/components/ui/dateline";
import { SubmitButton } from "@/components/ui/submit-button";
import { getSession, homeFor, safeNext } from "@/lib/auth";
import { demoLoginAction } from "./actions";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const session = await getSession();
  if (session) redirect(safeNext(next, homeFor(session.role)));

  return (
    <main className="mx-auto grid min-h-dvh max-w-5xl content-center gap-12 px-6 py-10 lg:grid-cols-[1fr_1fr] lg:gap-0">
      <section aria-labelledby="signin" className="lg:pr-14">
        <Wordmark />
        <Dateline className="mt-10">Sign in</Dateline>
        <h1 id="signin" className="mt-1 text-display">
          Back to the desk.
        </h1>
        <LoginForm next={next} />
        <p className="mt-6 text-small text-muted">
          New here?{" "}
          <Link href={next ? `/join?next=${encodeURIComponent(next)}` : "/join"} className="text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink">
            Join Byline
          </Link>
        </p>
      </section>

      <section aria-labelledby="demo" className="border-t border-ink pt-10 lg:border-l lg:border-t-0 lg:pl-14 lg:pt-0">
        <Dateline>No account needed</Dateline>
        <h2 id="demo" className="mt-1 text-display">
          Try it as a demo.
        </h2>
        <p className="mt-3 max-w-prose text-small text-muted">
          Two shared accounts with fictional data: a brand with a campaign in every state, and a creator with offers waiting. Anyone can use them, so things may already have moved. Reset from the account menu whenever you like.
        </p>
        <div className="mt-8 grid gap-3 sm:max-w-sm">
          <form action={demoLoginAction.bind(null, "brand", next ?? "")}>
            <SubmitButton variant="primary" className="w-full">
              Enter as the demo brand
            </SubmitButton>
          </form>
          <form action={demoLoginAction.bind(null, "creator", next ?? "")}>
            <SubmitButton variant="secondary" className="w-full">
              Enter as the demo creator
            </SubmitButton>
          </form>
        </div>
      </section>
    </main>
  );
}
