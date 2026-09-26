import { cn } from "@/lib/cn";

/** 4 px ink bar on a hairline track + mono readout. Fit is never a black box: pair with the "why" chips. */
export function FitBar({ score, className }: { score: number; className?: string }) {
  const s = Math.max(0, Math.min(100, Math.round(score)));
  return (
    <div className={cn("w-full min-w-24", className)}>
      <div role="meter" aria-valuenow={s} aria-valuemin={0} aria-valuemax={100} aria-label={`Fit ${s} percent`} className="h-1 bg-line">
        <div className="h-1 bg-ink" style={{ width: `${s}%` }} />
      </div>
      <p className="mt-1 font-mono text-caption tabular-nums">{s}% fit</p>
    </div>
  );
}
