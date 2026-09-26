import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Small mono tag — used for "why" reasons and facets. Text is muted-on-paper (5.1:1). */
export function Chip({ children, tone = "default", className }: { children: ReactNode; tone?: "default" | "green" | "ink"; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm border px-1.5 py-px font-mono text-caption",
        tone === "default" && "border-line-strong text-muted",
        tone === "green" && "border-green text-green",
        tone === "ink" && "border-ink bg-ink text-paper",
        className,
      )}
    >
      {children}
    </span>
  );
}
