"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Modal } from "@/components/ui/overlay";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { useReducedMotion } from "@/lib/use-reduced-motion";

type Phase = "idle" | "holding" | "committing" | "done" | "error";

/**
 * Press-and-hold to move money into escrow. Ink border + vermilion fill (border must reach 3:1; vermilion alone is 2.97:1).
 * Non-hold path: Enter/Space, or any click under reduced motion, opens a confirm dialog with the same summary.
 */
export function HoldButton({
  onCommit,
  summary,
  disabled,
  idleLabel = "Hold to place in escrow",
  doneLabel = "In escrow",
  holdMs = 900,
  className,
}: {
  onCommit: () => Promise<void> | void;
  summary: ReactNode;
  disabled?: boolean;
  idleLabel?: string;
  doneLabel?: string;
  holdMs?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const hintId = useId();
  const [phase, setPhase] = useState<Phase>("idle");
  const [confirm, setConfirm] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reset = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      if (reset.current) clearTimeout(reset.current);
    },
    [],
  );

  async function commit() {
    setPhase("committing");
    try {
      await onCommit();
      setPhase("done");
      reset.current = setTimeout(() => setPhase("idle"), 3000);
    } catch {
      setPhase("error");
      reset.current = setTimeout(() => setPhase("idle"), 4000);
    }
  }

  function start() {
    if (disabled || phase !== "idle" || reduced) return;
    setPhase("holding");
    timer.current = setTimeout(commit, holdMs);
  }
  function cancel() {
    if (phase !== "holding") return;
    if (timer.current) clearTimeout(timer.current);
    setPhase("idle");
  }

  const label =
    phase === "holding" ? "Keep holding…" : phase === "committing" ? "Placing hold…" : phase === "done" ? doneLabel : phase === "error" ? "Couldn’t place the hold — try again" : idleLabel;
  const busy = phase === "committing";

  return (
    <div className={className}>
      <button
        type="button"
        disabled={disabled || busy || phase === "done"}
        aria-busy={busy || undefined}
        aria-describedby={hintId}
        onPointerDown={(e) => {
          if (e.button === 0) start();
        }}
        onPointerUp={cancel}
        onPointerLeave={cancel}
        onPointerCancel={cancel}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (!disabled && phase === "idle") setConfirm(true);
          }
        }}
        onClick={() => {
          if (reduced && !disabled && phase === "idle") setConfirm(true);
        }}
        className={cn(
          "relative isolate min-h-12 w-full touch-none select-none overflow-hidden rounded-sm border border-ink bg-transparent text-body font-medium text-ink [-webkit-touch-callout:none] disabled:cursor-not-allowed disabled:opacity-50",
          phase === "done" && "bg-vermilion",
          phase === "error" && "border-2 border-vermilion-ink",
        )}
      >
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 -z-10 bg-vermilion ease-linear"
          style={{ width: phase === "holding" || phase === "committing" || phase === "done" ? "100%" : "0%", transitionProperty: "width", transitionDuration: phase === "holding" ? `${holdMs}ms` : "150ms" }}
        />
        <span role={phase === "error" ? "alert" : undefined}>{label}</span>
      </button>
      <p id={hintId} className="mt-1.5 text-caption text-muted">
        {reduced ? "Click to review and confirm." : "Press and hold, or press Enter to review and confirm."}
      </p>
      <Modal open={confirm} onOpenChange={setConfirm} title="Place this hold?" description="This moves the total from your wallet into escrow. You can cancel any offer before it goes live.">
        <div className="mb-5 border-y border-line py-3 text-small">{summary}</div>
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="secondary" onClick={() => setConfirm(false)}>
            Not yet
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              setConfirm(false);
              void commit();
            }}
          >
            Confirm and hold
          </Button>
        </div>
      </Modal>
    </div>
  );
}
