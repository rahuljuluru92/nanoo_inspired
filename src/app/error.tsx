"use client";

import { Wordmark } from "@/components/art/wordmark";
import { ErrorPanel } from "@/components/ui/error-panel";

/** Public pages (landing, kits, Receipts, sign-in): the error stays inside a minimal frame with the wordmark. */
export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main" className="mx-auto min-h-dvh max-w-3xl px-6 py-10">
      <Wordmark />
      <div className="mt-10">
        <ErrorPanel reset={reset} digest={error.digest} />
      </div>
    </main>
  );
}
