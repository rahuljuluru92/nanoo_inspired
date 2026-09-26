"use client";

import { useId } from "react";
import { cn } from "@/lib/cn";

export interface MixRow {
  tag: string;
  pct: number;
}

/**
 * "Who reads you?": pick up to N options, then say roughly how much of your audience each is.
 * Shares are self-reported and labelled as such everywhere they are shown.
 */
export function ShareMix({ legend, hint, options, max, value, onChange, defaultPct = 40 }: { legend: string; hint?: string; options: string[]; max: number; value: MixRow[]; onChange: (v: MixRow[]) => void; defaultPct?: number }) {
  const uid = useId();
  const has = (t: string) => value.some((r) => r.tag === t);
  const toggle = (t: string) => {
    if (has(t)) onChange(value.filter((r) => r.tag !== t));
    else if (value.length < max) onChange([...value, { tag: t, pct: value.length === 0 ? Math.max(defaultPct, 50) : defaultPct }]);
  };
  return (
    <fieldset>
      <legend className="text-small font-medium">{legend}</legend>
      {hint ? <p className="mt-0.5 text-caption text-muted">{hint}</p> : null}
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((o) => {
          const on = has(o);
          const locked = !on && value.length >= max;
          return (
            <button
              key={o}
              type="button"
              aria-pressed={on}
              disabled={locked}
              onClick={() => toggle(o)}
              className={cn("min-h-11 rounded-sm border px-3 text-small transition-colors duration-[var(--dur-1)] disabled:opacity-40", on ? "border-ink bg-highlight" : "border-line-strong hover:border-ink")}
            >
              {o}
            </button>
          );
        })}
      </div>
      {value.length ? (
        <ul className="mt-4 grid gap-4">
          {value.map((r) => (
            <li key={r.tag} className="grid grid-cols-[minmax(0,1fr)_3.5rem] items-center gap-x-3">
              <label htmlFor={`${uid}-${r.tag}`} className="text-small">
                {r.tag}
              </label>
              <output htmlFor={`${uid}-${r.tag}`} className="text-right font-mono text-small tabular-nums">
                {r.pct}%
              </output>
              <input
                id={`${uid}-${r.tag}`}
                type="range"
                min={5}
                max={100}
                step={5}
                value={r.pct}
                onChange={(e) => onChange(value.map((x) => (x.tag === r.tag ? { ...x, pct: Number(e.target.value) } : x)))}
                className="col-span-2 mt-1 h-11 w-full cursor-pointer accent-[var(--ink)]"
              />
            </li>
          ))}
        </ul>
      ) : null}
    </fieldset>
  );
}
