import { Sparkline } from "@/components/ui/sparkline";
import { Stamp } from "@/components/ui/stamp";
import { cn } from "@/lib/cn";
import { formatDay } from "@/lib/time";
import type { BookingStatus } from "@/lib/types";

export interface ShowItem {
  id: string;
  name: string;
  status: BookingStatus;
  /** ISO */
  start: string;
  end: string;
  clicksByDay?: number[];
  clicks?: number;
}

const DAY = 86_400_000;

function blockClass(s: BookingStatus) {
  if (s === "live") return "border-ink bg-highlight";
  if (s === "paid") return "border-ink bg-ink text-paper";
  if (s === "declined" || s === "cancelled") return "border-dashed border-line-strong text-muted";
  return "border-ink bg-paper-2";
}

/**
 * Campaign as a calendar: hairline day grid, one block per booking, live blocks carry click counts.
 * ≥768: timeline. Below: an agenda list (same information, no horizontal scrolling).
 */
export function RunOfShow({ items, rangeStart, rangeEnd, today }: { items: ShowItem[]; rangeStart: string; rangeEnd: string; today: string }) {
  const t0 = new Date(rangeStart).getTime();
  const t1 = new Date(rangeEnd).getTime();
  const span = Math.max(DAY, t1 - t0);
  const pos = (iso: string) => Math.max(0, Math.min(100, ((new Date(iso).getTime() - t0) / span) * 100));
  const days = Math.max(1, Math.round(span / DAY));
  const step = Math.max(1, Math.ceil(days / 7));
  const ticks = Array.from({ length: Math.floor(days / step) + 1 }, (_, i) => new Date(t0 + i * step * DAY).toISOString());
  const todayPct = pos(today);

  return (
    <div>
      <div className="hidden md:block">
        <div className="grid grid-cols-[11rem_minmax(0,1fr)]">
          <div />
          <div className="relative h-7 border-b border-ink font-mono text-caption text-muted">
            {ticks.map((t) => (
              <span key={t} className="absolute top-0 -translate-x-1/2 whitespace-nowrap" style={{ left: `${pos(t)}%` }}>
                {formatDay(t)}
              </span>
            ))}
          </div>
          {items.map((it) => (
            <div key={it.id} className="contents">
              <div className="flex min-h-14 flex-col justify-center gap-1 border-b border-line py-2 pr-3">
                <span className="truncate font-serif text-[1.05rem] leading-tight">{it.name}</span>
                <Stamp status={it.status} className="self-start" />
              </div>
              <div className="relative min-h-14 border-b border-line">
                {ticks.map((t) => (
                  <span key={t} aria-hidden="true" className="absolute inset-y-0 w-px bg-line" style={{ left: `${pos(t)}%` }} />
                ))}
                <div
                  className={cn("absolute top-3 flex h-8 items-center gap-2 overflow-hidden border px-2 font-mono text-caption", blockClass(it.status))}
                  style={{ left: `${pos(it.start)}%`, width: `max(2.5rem, ${Math.max(0, pos(it.end) - pos(it.start))}%)` }}
                >
                  {it.clicks !== undefined ? <span className="tabular-nums">{it.clicks.toLocaleString("en-IE")} clicks</span> : null}
                  {it.clicksByDay && it.clicksByDay.length > 1 ? <Sparkline data={it.clicksByDay} width={64} height={20} label={`${it.name} clicks by day`} /> : null}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="relative -mt-px">
          <div className="grid grid-cols-[11rem_minmax(0,1fr)]">
            <div />
            <div className="relative">
              <span aria-hidden="true" className="absolute -top-full bottom-0 w-0.5 bg-vermilion" style={{ left: `${todayPct}%`, height: `${items.length * 3.5 + 1.75}rem`, top: `-${items.length * 3.5}rem` }} />
              <span className="absolute -translate-x-1/2 bg-vermilion px-1 font-mono text-caption text-ink" style={{ left: `${todayPct}%`, top: "0.25rem" }}>
                Today
              </span>
            </div>
          </div>
        </div>
      </div>

      <ul className="md:hidden">
        {items.map((it) => (
          <li key={it.id} className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 border-t border-line py-3">
            <span className="font-serif text-[1.15rem] leading-tight">{it.name}</span>
            <Stamp status={it.status} />
            <span className="font-mono text-caption text-muted">
              {formatDay(it.start)} → {formatDay(it.end)}
            </span>
            <span className="text-right font-mono text-caption tabular-nums">{it.clicks !== undefined ? `${it.clicks.toLocaleString("en-IE")} clicks` : ""}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
