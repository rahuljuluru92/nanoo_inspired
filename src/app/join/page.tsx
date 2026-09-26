import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Wordmark } from "@/components/art/wordmark";
import { Dateline } from "@/components/ui/dateline";
import { getSession, homeFor } from "@/lib/auth";
import { JoinForm } from "./join-form";

export const metadata: Metadata = { title: "Join" };

export default async function JoinPage({ searchParams }: { searchParams: Promise<{ next?: string; role?: string }> }) {
  const { next, role } = await searchParams;
  const session = await getSession();
  if (session) redirect(homeFor(session.role));
  return (
    <main id="main" className="mx-auto min-h-dvh max-w-2xl px-6 py-10">
      <Wordmark />
      <Dateline className="mt-10">Join Byline</Dateline>
      <h1 className="mt-1 text-display">Pick your desk.</h1>
      <JoinForm next={next} defaultRole={role === "creator" ? "creator" : "brand"} />
      <p className="mt-8 text-small text-muted">
        Already have an account?{" "}
        <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} className="text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink">
          Sign in
        </Link>
      </p>
    </main>
  );
}
