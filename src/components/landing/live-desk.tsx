"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { BriefSentence } from "@/components/desk/brief-sentence";
import { RosterRow } from "@/components/desk/roster-row";
import { ButtonLink } from "@/components/ui/button";
import { Dateline } from "@/components/ui/dateline";
import { Skeleton } from "@/components/ui/skeleton";
import { briefToParams } from "@/lib/brief-params";
import { OPTIONS } from "@/lib/taxonomy";
import type { BriefValue, LineupCreator } from "@/lib/types";

interface ApiCreator {
  handle: string;
  name: string;
  headline: string;
  verticals: string[];
  followers: number;
  rateCents: number;
  fit: number;
  why: string[];
  projection: { low: number; mid: number; high: number };
  url: string;
  sandbox: boolean;
}

const toLineup = (c: ApiCreator): LineupCreator => ({
  id: c.handle,
  handle: c.handle,
  name: c.name,
  headline: c.headline,
  verticals: c.verticals,
  followers: c.followers,
  rateCents: c.rateCents,
  fit: c.fit,
  why: c.why,
  projection: c.projection,
  isSandbox: c.sandbox,
});

const SHOWN = 6;

/**
 * The landing page's hero is the product: write a brief, and the public API ranks real creators from the database, live.
 * No account needed. The first ranking is rendered on the server, so nothing flashes empty.
 */
export function LiveDesk({ initialBrief, initial }: { initialBrief: BriefValue; initial: { total: number; creators: LineupCreator[] } | null }) {
  const [brief, setBrief] = useState(initialBrief);
  const [result, setResult] = useState(initial);
  const [status, setStatus] = useState<"idle" | "loading" | "error">(initial ? "idle" : "error");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abort = useRef<AbortController | null>(null);

  async function load(b: BriefValue) {
    abort.current?.abort();
    const ctl = new AbortController();
    abort.current = ctl;
    setStatus("loading");
    try {
      const res = await fetch(`/api/lineup?${briefToParams(b)}&limit=${SHOWN}`, { signal: ctl.signal });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { total: number; creators: ApiCreator[] };
      setResult({ total: data.total, creators: data.creators.map(toLineup) });
      setStatus("idle");
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setStatus("error");
    }
  }

  function change(b: BriefValue) {
    setBrief(b);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void load(b), 250); // wait for a pause in editing
  }

  const carry = encodeURIComponent(`/desk?${briefToParams(brief)}`);

  return (
    <section aria-labelledby="live-desk" className="border-t-2 border-ink pt-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <Dateline>Live desk · nothing to sign up for</Dateline>
        <span role="status" aria-live="polite" className="font-mono text-caption text-muted">
          {status === "loading" ? "Ranking…" : result ? `Top ${result.creators.length} of ${result.total}, sorted by fit` : ""}
        </span>
      </div>
      <h2 id="live-desk" className="sr-only">
        Write a brief and see a ranked lineup
      </h2>
      <div className="mt-3">
        <BriefSentence value={brief} onChange={change} options={OPTIONS} />
      </div>
      <p className="mt-3 text-small text-muted">Click any highlighted part. The lineup below is ranked by the real database, and every score shows its reasons.</p>

      <div className="mt-8" aria-busy={status === "loading"}>
        {status === "error" && !result ? (
          <div role="alert" className="border border-vermilion-ink p-4 text-small">
            <p>Couldn’t load the lineup just now.</p>
            <button type="button" onClick={() => void load(brief)} className="mt-2 min-h-11 underline decoration-line-strong underline-offset-4 hover:decoration-ink">
              Try again
            </button>
          </div>
        ) : result ? (
          <ul className="border-b border-line">
            {result.creators.map((c) => (
              <RosterRow key={c.id} creator={c} href={`/c/${c.handle}`} />
            ))}
          </ul>
        ) : (
          <div aria-hidden="true" className="space-y-4">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        )}
        {status === "error" && result ? (
          <p role="alert" className="mt-3 text-small text-vermilion-ink">
            Couldn’t refresh the lineup. Showing the last one.{" "}
            <button type="button" onClick={() => void load(brief)} className="underline underline-offset-4">
              Retry
            </button>
          </p>
        ) : null}
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
        <ButtonLink href={`/login?next=${carry}`} variant="primary">
          Book this lineup
        </ButtonLink>
        <Link href={`/join?next=${carry}`} className="inline-flex min-h-11 items-center text-small underline decoration-line-strong underline-offset-4 hover:decoration-ink">
          Create an account
        </Link>
        <p className="text-caption text-muted">Fictional creators, real math. Test mode: no money moves.</p>
      </div>
    </section>
  );
}
