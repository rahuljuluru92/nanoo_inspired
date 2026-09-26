"use client";

import { useState } from "react";
import { Halftone } from "@/components/art/halftone";
import { Button } from "@/components/ui/button";
import { CountUp } from "@/components/ui/count-up";
import { Dateline } from "@/components/ui/dateline";
import { Icon } from "@/components/ui/icon";
import { Sheet } from "@/components/ui/overlay";
import { cn } from "@/lib/cn";
import { costPerClickCents, formatCount, formatEUR, formatEUR2 } from "@/lib/money";
import type { Projection } from "@/lib/types";
import { HoldButton } from "./hold-button";

export interface TrayItem {
  handle: string;
  name: string;
  priceCents: number;
  projection: Projection;
}

interface TrayProps {
  items: TrayItem[];
  budgetCents: number;
  walletCents: number;
  onRemove: (handle: string) => void;
  onCommit: () => Promise<void> | void;
  onAddFunds?: () => void;
  /** When set, the hold is disabled and this says what is missing. */
  blockedReason?: string;
  onFixBlocked?: () => void;
}

function totals(items: TrayItem[]) {
  const total = items.reduce((a, i) => a + i.priceCents, 0);
  const low = items.reduce((a, i) => a + i.projection.low, 0);
  const mid = items.reduce((a, i) => a + i.projection.mid, 0);
  const high = items.reduce((a, i) => a + i.projection.high, 0);
  return { total, low, mid, high };
}

function TrayPanel({ items, budgetCents, walletCents, onRemove, onCommit, onAddFunds, blockedReason, onFixBlocked, showHeading = true, pinAction = false }: TrayProps & { showHeading?: boolean; pinAction?: boolean }) {
  const { total, low, mid, high } = totals(items);
  const over = budgetCents > 0 && total > budgetCents;
  const short = total - walletCents;
  const cpc = costPerClickCents(total, mid);
  const pct = budgetCents > 0 ? Math.min(100, (total / budgetCents) * 100) : 0;

  return (
    <div className="flex flex-col gap-4">
      {showHeading ? (
        <div>
          <Dateline>Tray</Dateline>
          <h2 className="text-title">{items.length === 0 ? "No creators yet" : `${items.length} ${items.length === 1 ? "creator" : "creators"}`}</h2>
        </div>
      ) : null}

      {items.length === 0 ? (
        <p className="text-small text-muted">Add creators from the lineup and this tray shows what they should deliver before you commit a cent.</p>
      ) : (
        <ul className="border-y border-line">
          {items.map((i) => (
            <li key={i.handle} className="flex items-center gap-3 border-b border-line py-2 last:border-b-0">
              <Halftone seed={i.handle} size={28} />
              <span className="min-w-0 flex-1 truncate font-serif text-[1.05rem]">{i.name}</span>
              <span className="font-mono text-small tabular-nums">{formatEUR(i.priceCents)}</span>
              <button type="button" onClick={() => onRemove(i.handle)} aria-label={`Remove ${i.name}`} className="-mr-2 inline-flex size-11 items-center justify-center hover:text-vermilion-ink">
                <Icon name="close" size={18} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <dl className="grid grid-cols-[1fr_auto] items-baseline gap-x-4 gap-y-2 text-small">
        <dt className="text-muted">Projected clicks</dt>
        <dd className="font-mono text-body tabular-nums">
          {items.length ? (
            <>
              <CountUp value={low} format={formatCount} />–<CountUp value={high} format={formatCount} />
            </>
          ) : (
            "—"
          )}
        </dd>
        <dt className="text-muted">Total</dt>
        <dd className="font-serif text-title tabular-nums">
          <CountUp value={total} format={(n) => formatEUR(Math.round(n / 100) * 100)} />
        </dd>
        <dt className="text-muted">Est. cost per click</dt>
        <dd className="font-mono tabular-nums text-green">{cpc === null ? "—" : formatEUR2(cpc)}</dd>
      </dl>

      {budgetCents > 0 ? (
        <div>
          <div role="meter" aria-label="Budget used" aria-valuemin={0} aria-valuemax={budgetCents} aria-valuenow={Math.min(total, budgetCents)} className="h-1 bg-line">
            <div className={cn("h-1", over ? "bg-vermilion" : "bg-green")} style={{ width: `${pct}%` }} />
          </div>
          <p className={cn("mt-1 font-mono text-caption", over ? "text-vermilion-ink" : "text-muted")}>
            {over ? `${formatEUR(total - budgetCents)} over your ${formatEUR(budgetCents)} budget` : `${formatEUR(budgetCents - total)} left of ${formatEUR(budgetCents)}`}
          </p>
        </div>
      ) : null}

      <p className="text-caption text-muted">Estimated from each creator&rsquo;s recent posts. A range, not a guarantee.</p>

      {items.length > 0 && short > 0 ? (
        <div role="alert" className="border border-vermilion-ink p-3 text-small">
          <p>Your wallet is {formatEUR(short)} short. Add test funds to place this hold.</p>
          {onAddFunds ? (
            <Button variant="secondary" className="mt-2" onClick={onAddFunds}>
              Add test funds
            </Button>
          ) : null}
        </div>
      ) : null}

      {items.length > 0 && blockedReason ? (
        <div className="border border-line-strong p-3 text-small">
          <p>{blockedReason}</p>
          {onFixBlocked ? (
            <Button variant="secondary" className="mt-2" onClick={onFixBlocked}>
              Fill in details
            </Button>
          ) : null}
        </div>
      ) : null}

      {/* In the phone sheet the primary action stays pinned to the bottom edge, so it is never below the fold. */}
      <div className={cn(pinAction && "sticky bottom-0 -mx-5 -mb-5 border-t border-line bg-paper-2 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3")}>
        <HoldButton
          disabled={items.length === 0 || short > 0 || Boolean(blockedReason)}
          onCommit={onCommit}
          summary={
            <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1">
              <dt className="text-muted">Creators</dt>
              <dd className="font-mono">{items.length}</dd>
              <dt className="text-muted">Into escrow</dt>
              <dd className="font-mono">{formatEUR(total)}</dd>
              <dt className="text-muted">Wallet after</dt>
              <dd className="font-mono">{formatEUR(walletCents - total)}</dd>
            </dl>
          }
        />
      </div>
    </div>
  );
}

/**
 * ≥1024: sticky side panel. Below: a peek bar above the tab bar that opens a bottom sheet.
 * The peek bar always shows the three numbers that matter: count · total · projected clicks.
 */
export function Tray(props: TrayProps) {
  const [open, setOpen] = useState(false);
  const { total, low, high } = totals(props.items);
  const n = props.items.length;
  return (
    <>
      <section aria-label="Campaign tray" className="sticky top-[calc(var(--masthead-h)+var(--ticker-h)+1rem)] hidden self-start border border-ink bg-paper-2 p-5 lg:block">
        <TrayPanel {...props} />
      </section>

      {/* Sticky, not fixed: it rides the bottom of the viewport only while the Desk is on screen, above the tab bar on phones. */}
      <div className="sticky bottom-[calc(var(--tabbar-h)+env(safe-area-inset-bottom))] z-30 -mx-4 border-t border-ink bg-paper-2 md:-mx-6 md:bottom-0 lg:hidden">
        <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" className="mx-auto flex min-h-14 w-full max-w-[90rem] items-center justify-between gap-3 px-4 text-left md:px-6">
          <span className="font-mono text-small tabular-nums">
            {n === 0 ? "Tray empty" : `${n} · ${formatEUR(total)} · ~${formatCount(low)}–${formatCount(high)} clicks`}
          </span>
          <span className="inline-flex items-center gap-1 text-small font-medium">
            Review <Icon name="chevron" size={16} className="-rotate-90" />
          </span>
        </button>
      </div>
      <Sheet open={open} onOpenChange={setOpen} title={n === 0 ? "Your tray is empty" : `Your tray · ${n} ${n === 1 ? "creator" : "creators"}`} side="bottom">
        <TrayPanel
          {...props}
          showHeading={false}
          pinAction
          onFixBlocked={
            props.onFixBlocked
              ? () => {
                  setOpen(false); // the details live on the page behind the sheet: get out of the way first
                  props.onFixBlocked?.();
                }
              : undefined
          }
        />
      </Sheet>
    </>
  );
}
