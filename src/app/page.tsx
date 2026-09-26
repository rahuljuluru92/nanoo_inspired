import Link from "next/link";
import { Wordmark } from "@/components/art/wordmark";
import { Dateline } from "@/components/ui/dateline";
import { ButtonLink } from "@/components/ui/button";

/** Placeholder until Phase 7 (landing with the live desk). */
export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center gap-6 px-6 py-16">
      <Wordmark />
      <Dateline>Under construction · phase 2 of 9</Dateline>
      <h1 className="text-display-xl">Book the people your buyers already read.</h1>
      <p className="max-w-prose text-body text-muted">
        Byline is a wire desk for B2B creator campaigns: write a brief, assemble a lineup, watch the wire, keep the receipt. The product is being built in the open; the design system is live.
      </p>
      <div className="flex flex-wrap gap-3">
        <ButtonLink href="/styleguide" variant="primary">
          See the design system
        </ButtonLink>
        <Link href="/styleguide#desk" className="inline-flex min-h-11 items-center underline decoration-line-strong underline-offset-4 hover:decoration-ink">
          Jump to the desk demo
        </Link>
      </div>
    </main>
  );
}
