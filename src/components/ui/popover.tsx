"use client";

import * as P from "@radix-ui/react-popover";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Popover({
  trigger,
  children,
  open,
  onOpenChange,
  className,
  label,
}: {
  trigger: ReactNode;
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  /** Accessible name for the popover panel. */
  label: string;
}) {
  return (
    <P.Root open={open} onOpenChange={onOpenChange}>
      <P.Trigger asChild>{trigger}</P.Trigger>
      <P.Portal>
        <P.Content
          aria-label={label}
          align="start"
          sideOffset={6}
          collisionPadding={12}
          className={cn("z-50 w-[min(92vw,22rem)] border border-ink bg-paper-2 p-3 data-[state=open]:animate-fade-in", className)}
        >
          {children}
        </P.Content>
      </P.Portal>
    </P.Root>
  );
}
