"use client";

import * as T from "@radix-ui/react-tabs";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Tabs({
  tabs,
  defaultValue,
  className,
}: {
  tabs: { value: string; label: string; content: ReactNode }[];
  defaultValue?: string;
  className?: string;
}) {
  return (
    <T.Root defaultValue={defaultValue ?? tabs[0]?.value} className={className}>
      <T.List className="flex gap-6 border-b border-line-strong" aria-label="Sections">
        {tabs.map((t) => (
          <T.Trigger
            key={t.value}
            value={t.value}
            className={cn(
              "-mb-px min-h-11 border-b-2 border-transparent px-0.5 text-body text-muted",
              "data-[state=active]:border-ink data-[state=active]:text-ink hover:text-ink",
            )}
          >
            {t.label}
          </T.Trigger>
        ))}
      </T.List>
      {tabs.map((t) => (
        <T.Content key={t.value} value={t.value} className="pt-4">
          {t.content}
        </T.Content>
      ))}
    </T.Root>
  );
}
