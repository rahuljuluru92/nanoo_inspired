import { LocalTime } from "@/components/ui/local-time";
import type { WireEvent } from "@/lib/types";

/** One line of the full Wire feed. */
export function WireItem({ event }: { event: WireEvent }) {
  return (
    <li className="grid grid-cols-[3.25rem_minmax(0,1fr)] gap-3 border-t border-line py-2.5 text-small sm:grid-cols-[3.25rem_minmax(0,1fr)_6rem]">
      <span className="font-mono text-caption text-muted">
        <LocalTime iso={event.at} mode="clock" />
      </span>
      <span>{event.text}</span>
      <span className="col-start-2 font-mono text-caption text-muted sm:col-start-auto sm:text-right">
        <LocalTime iso={event.at} mode="ago" />
      </span>
    </li>
  );
}
