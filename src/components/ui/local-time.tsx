"use client";

import { useSyncExternalStore } from "react";
import { formatClock, timeAgo } from "@/lib/time";

const WINDOW = 15_000;
const subscribe = (cb: () => void) => {
  const id = setInterval(cb, WINDOW);
  return () => clearInterval(id);
};
/** 0 on the server and during hydration, then a value that changes every 15 s (so "ago" text stays fresh). */
const useTick = () => useSyncExternalStore(subscribe, () => Math.floor(Date.now() / WINDOW), () => 0);

/**
 * Renders in the viewer's own timezone, client-side only, so server and browser can never disagree.
 * Empty until mounted (a few ms) — layouts reserve the space, so nothing shifts.
 */
export function LocalTime({ iso, mode }: { iso: string; mode: "clock" | "ago" }) {
  const tick = useTick();
  const text = tick === 0 ? "" : mode === "clock" ? formatClock(iso) : timeAgo(iso, tick * WINDOW);
  return (
    <time dateTime={iso} className="tabular-nums">
      {text}
    </time>
  );
}
