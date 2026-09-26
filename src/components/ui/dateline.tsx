import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Mono caption used as a label — "Brief № 0042 · filed 26 Sep". Sentence case, wide tracking. */
export function Dateline({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("font-mono text-caption tracking-[0.04em] text-muted", className)}>{children}</p>;
}
