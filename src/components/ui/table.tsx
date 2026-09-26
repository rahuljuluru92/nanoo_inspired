import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/**
 * Hairline-ruled table inside its own scroll region, so wide tables never break the page on phones.
 * The region is `relative` on purpose: `sr-only` text is absolutely positioned and would otherwise escape the clip and widen the page.
 */
export function Table({ children, caption, className }: { children: ReactNode; caption?: string; className?: string }) {
  return (
    <div className="relative overflow-x-auto" tabIndex={0} role="region" aria-label={caption ?? "Table"}>
      <table className={cn("w-full border-collapse text-small", className)}>
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        {children}
      </table>
    </div>
  );
}
export const THead = ({ children }: { children: ReactNode }) => <thead className="border-b border-ink">{children}</thead>;
export const TBody = ({ children }: { children: ReactNode }) => <tbody className="[&>tr]:border-b [&>tr]:border-line">{children}</tbody>;
export const TR = (p: HTMLAttributes<HTMLTableRowElement>) => <tr {...p} />;
export const TH = ({ num, className, ...p }: ThHTMLAttributes<HTMLTableCellElement> & { num?: boolean }) => (
  <th scope="col" className={cn("px-3 py-2 text-left font-mono text-caption font-normal text-muted", num && "text-right", className)} {...p} />
);
export const TD = ({ num, className, ...p }: TdHTMLAttributes<HTMLTableCellElement> & { num?: boolean }) => (
  <td className={cn("px-3 py-3 align-top", num && "text-right font-mono tabular-nums", className)} {...p} />
);
