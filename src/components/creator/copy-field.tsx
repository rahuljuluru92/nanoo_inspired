"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

/** A read-only value with a Copy button. Falls back to selecting the text if the clipboard API is unavailable. */
export function CopyField({ path, label }: { path: string; label: string }) {
  // The site address is only known in the browser: read it without an effect (empty on the server and during hydration).
  const origin = useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => "",
  );
  const [copied, setCopied] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const value = `${origin}${path}`;
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      input.current?.select();
    }
  }
  return (
    <div>
      <label htmlFor="copy-field" className="text-small font-medium">
        {label}
      </label>
      <div className="mt-1.5 flex gap-2">
        <input id="copy-field" ref={input} readOnly value={value} onFocus={(e) => e.currentTarget.select()} className="min-h-11 min-w-0 flex-1 rounded-sm border border-line-strong bg-paper-2 px-3 font-mono text-small" />
        <Button onClick={copy} aria-live="polite">
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
    </div>
  );
}
