import { cn } from "@/lib/cn";
import { LocalTime } from "@/components/ui/local-time";
import type { WireEvent } from "@/lib/types";

/**
 * The Wire ticker: a 28 px strip under the masthead. Newest first; one event on phones, three from md.
 * A separate visually-hidden live region announces only meaningful events — never every click.
 */
export function Ticker({ events }: { events: WireEvent[] }) {
  const shown = events.slice(0, 3);
  const announce = events.find((e) => e.kind !== "click");
  return (
    <div className="border-t border-line bg-paper-2" role="region" aria-label="The Wire, latest events">
      <div className="mx-auto flex h-[var(--ticker-h)] max-w-[90rem] items-center gap-4 overflow-hidden px-4 font-mono text-caption md:px-6">
        <span className="flex shrink-0 items-center gap-1.5">
          <span aria-hidden="true" className="size-1.5 animate-live rounded-full bg-vermilion" />
          Wire
        </span>
        {shown.length === 0 ? (
          <span className="min-w-0 truncate text-muted">Quiet for now. Events appear here as they happen.</span>
        ) : (
          <ol className="flex min-w-0 items-center gap-6 whitespace-nowrap">
            {shown.map((e, i) => (
              <li key={e.id} className={cn(i === 0 ? "min-w-0 shrink-0 animate-slide-in truncate" : i === 1 ? "hidden min-w-0 truncate text-muted md:block" : "hidden min-w-0 truncate text-muted xl:block")}>
                <LocalTime iso={e.at} mode="clock" /> · {e.text}
              </li>
            ))}
          </ol>
        )}
      </div>
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announce ? announce.text : ""}
      </div>
    </div>
  );
}
