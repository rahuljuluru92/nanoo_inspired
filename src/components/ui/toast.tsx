"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";

interface Toast {
  id: number;
  title: string;
  body?: string;
  tone?: "default" | "error";
}
interface Ctx {
  push: (t: Omit<Toast, "id">) => void;
}
const ToastCtx = createContext<Ctx>({ push: () => {} });

export const useToast = () => useContext(ToastCtx);

/** Bottom-left, mono, polite live region. Auto-dismisses after 6 s; errors stay until closed. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const next = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    setItems((xs) => xs.filter((x) => x.id !== id));
    const t = timers.current.get(id);
    if (t) clearTimeout(t);
    timers.current.delete(id);
  }, []);

  const push = useCallback(
    (t: Omit<Toast, "id">) => {
      const id = next.current++;
      setItems((xs) => [...xs.slice(-3), { ...t, id }]);
      if (t.tone !== "error") timers.current.set(id, setTimeout(() => dismiss(id), 6000));
    },
    [dismiss],
  );

  useEffect(() => {
    const map = timers.current;
    return () => map.forEach(clearTimeout);
  }, []);

  const value = useMemo(() => ({ push }), [push]);
  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed bottom-[calc(var(--tabbar-h)+env(safe-area-inset-bottom)+0.75rem)] left-3 z-[60] flex w-[min(92vw,24rem)] flex-col gap-2 md:bottom-4"
      >
        {items.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto animate-slide-in border bg-paper-2 p-3 font-mono text-small",
              t.tone === "error" ? "border-vermilion-ink" : "border-ink",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <p className={cn("font-medium", t.tone === "error" && "text-vermilion-ink")}>{t.title}</p>
              <button type="button" onClick={() => dismiss(t.id)} aria-label="Dismiss" className="-m-2 inline-flex size-10 items-center justify-center">
                <Icon name="close" size={16} />
              </button>
            </div>
            {t.body ? <p className="mt-0.5 text-muted">{t.body}</p> : null}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
