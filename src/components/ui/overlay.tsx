"use client";

import * as Dialog from "@radix-ui/react-dialog";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";

const overlay = "fixed inset-0 z-40 bg-ink/40 data-[state=open]:animate-fade-in";
const closeBtn =
  "absolute right-2 top-2 inline-flex size-11 items-center justify-center rounded-sm border border-transparent hover:border-ink";

/** Centred dialog for confirmations. Focus is trapped and restored by Radix; Esc closes. */
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={overlay} />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,30rem)] -translate-x-1/2 -translate-y-1/2 border border-ink bg-paper-2 p-6 data-[state=open]:animate-fade-in"
          {...(description ? {} : { "aria-describedby": undefined })}
        >
          <Dialog.Title className="pr-10 font-serif text-title">{title}</Dialog.Title>
          {description ? <Dialog.Description className="mt-2 text-small text-muted">{description}</Dialog.Description> : null}
          <div className="mt-5">{children}</div>
          <Dialog.Close className={closeBtn} aria-label="Close">
            <Icon name="close" />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Bottom sheet (phones/tablets) or right drawer (desktop detail). */
export function Sheet({
  open,
  onOpenChange,
  title,
  side = "bottom",
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  side?: "bottom" | "right";
  children: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={overlay} />
        <Dialog.Content
          aria-describedby={undefined}
          tabIndex={-1}
          onOpenAutoFocus={(e) => {
            // Radix would focus the first control, which can be a destructive "remove" button. Focus the sheet instead.
            e.preventDefault();
            (e.currentTarget as HTMLElement).focus();
          }}
          className={cn(
            "fixed z-50 flex flex-col overflow-y-auto border-ink bg-paper-2 outline-none",
            side === "bottom" &&
              "inset-x-0 bottom-0 max-h-[88dvh] border-t pb-[env(safe-area-inset-bottom)] data-[state=open]:animate-sheet-bottom",
            side === "right" && "inset-y-0 right-0 w-[min(100vw,28rem)] border-l data-[state=open]:animate-sheet-right",
          )}
        >
          {side === "bottom" ? <div aria-hidden="true" className="mx-auto mt-2 h-0.5 w-8 bg-line-strong" /> : null}
          <Dialog.Title className="px-5 pb-1 pt-4 pr-14 font-serif text-title">{title}</Dialog.Title>
          <div className="px-5 pb-5">{children}</div>
          <Dialog.Close className={closeBtn} aria-label="Close">
            <Icon name="close" />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
