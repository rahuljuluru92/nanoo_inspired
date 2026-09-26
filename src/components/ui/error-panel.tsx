"use client";

import Link from "next/link";
import { Button } from "./button";
import { Dateline } from "./dateline";

/**
 * What every error boundary shows: what happened in plain words, that nothing was lost, and a way back.
 * The technical detail stays in the server logs (the digest ties the two together); nothing raw reaches the reader.
 */
export function ErrorPanel({ reset, digest, home = "/" }: { reset: () => void; digest?: string; home?: string }) {
  return (
    <div role="alert" className="mx-auto max-w-2xl border-y border-ink py-12">
      <Dateline>Something went wrong on our side</Dateline>
      <h1 className="mt-2 text-display">That didn’t load.</h1>
      <p className="mt-3 max-w-prose text-body text-muted">Nothing you did was lost. Money only ever moves in a single step that either completes or doesn’t, so a failure here can’t leave anything half-done.</p>
      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
        <Button variant="primary" onClick={reset}>
          Try again
        </Button>
        <Link href={home} className="inline-flex min-h-11 items-center underline decoration-line-strong underline-offset-4 hover:decoration-ink">
          Go back
        </Link>
      </div>
      {digest ? <p className="mt-6 font-mono text-caption text-muted">Reference {digest}</p> : null}
    </div>
  );
}
