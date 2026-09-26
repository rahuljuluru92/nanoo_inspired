import { cn } from "@/lib/cn";

/** Hatched paper lines, not a grey shimmer. Purely visual; pair with an aria-busy region. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("h-4 border border-line bg-[repeating-linear-gradient(135deg,var(--line)_0_1px,transparent_1px_6px)]", className)}
    />
  );
}
