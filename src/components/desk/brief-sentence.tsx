"use client";

import { useId, useState, type ReactNode } from "react";
import { Popover } from "@/components/ui/popover";
import { Input } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { formatEUR } from "@/lib/money";
import type { BriefValue } from "@/lib/types";

export interface BriefOptions {
  buyers: string[];
  verticals: string[];
  geo: string[];
}

const PRESETS = [250000, 600000, 1000000, 2500000];

/** A slot in the sentence: highlighter-underlined, ≥44 px tall on touch, opens a popover. */
function Slot({ label, display, placeholder, children }: { label: string; display: string; placeholder: string; children: ReactNode }) {
  const empty = !display;
  return (
    <Popover
      label={label}
      trigger={
        <button
          type="button"
          aria-label={`${label}: ${display || placeholder}. Edit`}
          className={cn(
            "inline-flex min-h-11 items-center px-1 align-baseline shadow-[inset_0_-0.4em_0_var(--highlight)] hover:shadow-[inset_0_-1.2em_0_var(--highlight)] md:min-h-9",
            empty && "italic text-muted",
          )}
        >
          {display || placeholder}
        </button>
      }
    >
      {children}
    </Popover>
  );
}

/** Punctuation that follows a slot: pulled in so it doesn't float after the slot's padding. */
function Punct({ children }: { children: ReactNode }) {
  return <span className="-ml-1">{children}</span>;
}

function summarize(list: string[]) {
  if (list.length === 0) return "";
  if (list.length <= 2) return list.join(" and ");
  return `${list[0]}, ${list[1]} +${list.length - 2}`;
}

function MultiPicker({ options, value, onChange, name }: { options: string[]; value: string[]; onChange: (v: string[]) => void; name: string }) {
  return (
    <div role="group" aria-label={name} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <button
            key={o}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((x) => x !== o) : [...value, o])}
            className={cn(
              "min-h-11 rounded-sm border px-3 text-small transition-colors duration-[var(--dur-1)] md:min-h-9",
              on ? "border-ink bg-highlight" : "border-line-strong hover:border-ink",
            )}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

/**
 * The brief IS the search: "I'm launching [product] to [buyers] in [verticals], across [geo], with [budget]."
 * Every slot change calls onChange — the lineup below re-ranks live.
 */
export function BriefSentence({ value, onChange, options }: { value: BriefValue; onChange: (v: BriefValue) => void; options: BriefOptions }) {
  const uid = useId();
  const [budgetText, setBudgetText] = useState(String(Math.round(value.budgetCents / 100)));
  const set = <K extends keyof BriefValue>(k: K, v: BriefValue[K]) => onChange({ ...value, [k]: v });

  return (
    <p className="font-serif text-[clamp(1.5rem,1.1rem+1.8vw,2.4rem)] leading-[1.35]">
      I&rsquo;m launching{" "}
      <Slot label="Product" display={value.product} placeholder="a product">
        <label htmlFor={`${uid}-p`} className="mb-1.5 block font-sans text-small font-medium">
          What are you launching?
        </label>
        <Input id={`${uid}-p`} value={value.product} placeholder="a SOC 2 automation tool" onChange={(e) => set("product", e.target.value)} />
      </Slot>{" "}
      to{" "}
      <Slot label="Buyers" display={summarize(value.buyers)} placeholder="your buyers">
        <MultiPicker name="Buyers" options={options.buyers} value={value.buyers} onChange={(v) => set("buyers", v)} />
      </Slot>{" "}
      in{" "}
      <Slot label="Vertical" display={summarize(value.verticals)} placeholder="any vertical">
        <MultiPicker name="Vertical" options={options.verticals} value={value.verticals} onChange={(v) => set("verticals", v)} />
      </Slot>
      <Punct>,</Punct> across{" "}
      <Slot label="Geography" display={summarize(value.geo)} placeholder="anywhere">
        <MultiPicker name="Geography" options={options.geo} value={value.geo} onChange={(v) => set("geo", v)} />
      </Slot>
      <Punct>,</Punct> with{" "}
      <Slot label="Budget" display={value.budgetCents > 0 ? formatEUR(value.budgetCents) : ""} placeholder="a budget">
        <div className="flex flex-wrap gap-2 font-sans">
          {PRESETS.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={value.budgetCents === c}
              onClick={() => {
                set("budgetCents", c);
                setBudgetText(String(c / 100));
              }}
              className={cn("min-h-11 rounded-sm border px-3 font-mono text-small md:min-h-9", value.budgetCents === c ? "border-ink bg-highlight" : "border-line-strong hover:border-ink")}
            >
              {formatEUR(c)}
            </button>
          ))}
        </div>
        <label htmlFor={`${uid}-b`} className="mb-1.5 mt-3 block font-sans text-small font-medium">
          Exact budget in euros
        </label>
        <Input
          id={`${uid}-b`}
          inputMode="numeric"
          value={budgetText}
          onChange={(e) => {
            const digits = e.target.value.replace(/[^\d]/g, "").slice(0, 7);
            setBudgetText(digits);
            set("budgetCents", Number(digits || 0) * 100);
          }}
          className="font-mono"
        />
      </Slot>
      <Punct>.</Punct>
    </p>
  );
}
