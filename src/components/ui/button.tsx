import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "md" | "sm";

/** Primary = vermilion fill + INK text (5.6:1). White on vermilion fails AA — never. */
const base =
  "inline-flex select-none items-center justify-center gap-2 rounded-sm border font-sans font-medium whitespace-nowrap transition-colors duration-[var(--dur-1)] disabled:cursor-not-allowed disabled:opacity-50 aria-busy:cursor-progress";
const variants: Record<Variant, string> = {
  primary: "border-vermilion bg-vermilion text-ink hover:border-ink",
  secondary: "border-ink bg-transparent text-ink hover:bg-ink hover:text-paper",
  ghost: "border-transparent bg-transparent text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink",
  danger: "border-ink bg-transparent text-vermilion-ink hover:bg-vermilion-ink hover:text-paper",
};
const sizes: Record<Size, string> = {
  md: "min-h-11 px-4 text-body",
  sm: "min-h-9 px-3 text-small",
};

export function buttonClass(variant: Variant = "secondary", size: Size = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Shows a mono "…" and disables the button while an action is in flight. */
  pending?: boolean;
}

export function Button({ variant = "secondary", size = "md", pending, className, children, disabled, type = "button", ...rest }: ButtonProps) {
  return (
    <button type={type} className={buttonClass(variant, size, className)} disabled={disabled || pending} aria-busy={pending || undefined} {...rest}>
      {children}
      {pending ? <span className="font-mono" aria-hidden="true">…</span> : null}
    </button>
  );
}

export function ButtonLink({
  variant = "secondary",
  size = "md",
  className,
  children,
  ...rest
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size; children: ReactNode }) {
  return (
    <Link className={buttonClass(variant, size, className)} {...rest}>
      {children}
    </Link>
  );
}
