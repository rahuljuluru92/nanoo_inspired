import { useId, useMemo } from "react";
import { halftoneDots } from "@/lib/halftone";
import { cn } from "@/lib/cn";

/** Deterministic dot-portrait from a seed (usually the creator's handle). Decorative unless `label` is given. */
export function Halftone({ seed, size = 48, label, className }: { seed: string; size?: number; label?: string; className?: string }) {
  const dots = useMemo(() => halftoneDots(seed), [seed]);
  const clip = `ht-${useId().replace(/:/g, "")}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("shrink-0 rounded-full border border-line-strong bg-line", className)}
    >
      <clipPath id={clip}>
        <circle cx="50" cy="50" r="50" />
      </clipPath>
      <g clipPath={`url(#${clip})`} fill="var(--ink)">
        {dots.map((d, i) => (
          <circle key={i} cx={d.x} cy={d.y} r={d.r} />
        ))}
      </g>
    </svg>
  );
}
