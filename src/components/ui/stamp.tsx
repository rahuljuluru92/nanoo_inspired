import type { BookingStatus } from "@/lib/types";
import { cn } from "@/lib/cn";

const LABEL: Record<BookingStatus, string> = {
  invited: "Invited",
  accepted: "Accepted",
  declined: "Declined",
  drafted: "Drafted",
  changes_requested: "Changes asked",
  approved: "Approved",
  live: "Live",
  paid: "Paid",
  cancelled: "Cancelled",
};

/** Square status marker. Meaning is in the TEXT and the glyph shape, never colour alone. */
export function Stamp({ status, className }: { status: BookingStatus; className?: string }) {
  const done = status === "paid";
  const off = status === "declined" || status === "cancelled";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border px-1.5 py-px font-mono text-caption",
        done ? "border-green bg-green text-paper" : off ? "border-line-strong text-muted line-through" : "border-ink text-ink",
        className,
      )}
    >
      {status === "live" ? (
        <span aria-hidden="true" className="size-1.5 animate-live rounded-full bg-vermilion" />
      ) : (
        <span aria-hidden="true" className={cn("size-1.5", done ? "bg-paper" : off ? "border border-line-strong" : "border border-ink")} />
      )}
      {LABEL[status]}
    </span>
  );
}
