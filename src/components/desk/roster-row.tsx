"use client";

import Link from "next/link";
import { Halftone } from "@/components/art/halftone";
import { Chip } from "@/components/ui/chip";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { formatEUR, formatRange } from "@/lib/money";
import type { LineupCreator } from "@/lib/types";
import { FitBar } from "./fit-bar";

/**
 * A roster row, not a card. Container-query layout: one dense row at ≥36rem, a stacked two-line layout below.
 * Selected rows get a highlighter wash. Over-budget creators stay fully legible and say so in words.
 */
export function RosterRow({
  creator,
  selected = false,
  overBudgetCents = 0,
  onToggle,
  href,
}: {
  creator: LineupCreator;
  selected?: boolean;
  overBudgetCents?: number;
  /** Omit for a read-only preview row (no add button), e.g. on the landing page. */
  onToggle?: () => void;
  /** Makes the name a link (the creator's public kit). */
  href?: string;
}) {
  const { name, headline, handle, why, fit, rateCents, projection, isSandbox } = creator;
  return (
    <li className={cn("@container border-t border-line", selected && "bg-highlight/30")}>
      <div className={cn("grid grid-cols-[3rem_minmax(0,1fr)_auto] items-start gap-x-3 gap-y-2 px-2 py-3 @xl:items-center", onToggle ? "@xl:grid-cols-[3.25rem_minmax(0,1fr)_9rem_6.5rem_7.5rem_2.75rem]" : "@xl:grid-cols-[3.25rem_minmax(0,1fr)_9rem_6.5rem_7.5rem]")}>
        <Halftone seed={handle} size={48} />
        <div className="min-w-0">
          <p className="font-serif text-[1.25rem] leading-tight">
            {href ? (
              <Link href={href} className="underline-offset-4 hover:underline">
                {name}
              </Link>
            ) : (
              name
            )}
            {isSandbox ? <span className="ml-2 align-middle font-mono text-caption text-muted">sandbox</span> : null}
          </p>
          <p className="truncate text-small text-muted">{headline}</p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {why.map((w) => (
              <Chip key={w}>{w}</Chip>
            ))}
          </div>
        </div>
        <div className="col-span-2 col-start-2 flex flex-wrap items-end gap-x-4 gap-y-2 @xl:contents">
          <FitBar score={fit} className="flex-1 @xl:flex-none" />
          <div className="font-mono text-small tabular-nums">
            <p>{formatEUR(rateCents)}</p>
            {overBudgetCents > 0 ? <p className="text-caption text-vermilion-ink">{formatEUR(overBudgetCents)} over</p> : <p className="text-caption text-muted">per post</p>}
          </div>
          <div className="font-mono text-small tabular-nums">
            <p>{formatRange(projection.low, projection.high)}</p>
            <p className="text-caption text-muted">est. clicks</p>
          </div>
        </div>
        {onToggle ? (
          <button
            type="button"
            onClick={onToggle}
            aria-pressed={selected}
            aria-label={`${selected ? "Remove" : "Add"} ${name} ${selected ? "from" : "to"} lineup`}
            className={cn(
              "col-start-3 row-start-1 inline-flex size-11 items-center justify-center rounded-sm border border-ink transition-colors duration-[var(--dur-1)] @xl:col-start-auto @xl:row-start-auto",
              selected ? "bg-ink text-paper" : "bg-transparent text-ink hover:bg-ink hover:text-paper",
            )}
          >
            <Icon name={selected ? "check" : "plus"} />
          </button>
        ) : null}
      </div>
    </li>
  );
}
