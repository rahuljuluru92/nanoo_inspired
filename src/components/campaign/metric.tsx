"use client";

import { CountUp } from "@/components/ui/count-up";
import { formatEUR, formatEUR2 } from "@/lib/money";

/** Server components can't pass functions to client ones, so the format is a plain string that picks the formatter here. */
export type MetricKind = "eur" | "eur2" | "count";
const FORMAT: Record<MetricKind, (n: number) => string> = {
  eur: (n) => formatEUR(Math.round(n / 100) * 100),
  eur2: (n) => formatEUR2(Math.round(n)),
  count: (n) => Math.round(n).toLocaleString("en-IE"),
};

/** A number that counts up when it changes (clicks arriving), with a pulsing dot while something is live. */
export function Metric({ label, value, kind, live }: { label: string; value: number | null; kind: MetricKind; live?: boolean }) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 font-mono text-caption text-muted">
        {label}
        {live ? <span role="img" aria-label="live" className="size-1.5 animate-live rounded-full bg-vermilion" /> : null}
      </dt>
      <dd className="font-serif text-title tabular-nums">{value === null ? "—" : <CountUp value={value} format={FORMAT[kind]} />}</dd>
    </div>
  );
}
