"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import type { NavItem } from "./masthead";

/** Phone navigation: same destinations as the masthead, in the thumb zone, safe-area aware. */
export function BottomTabs({ nav }: { nav: NavItem[] }) {
  const path = usePathname();
  return (
    <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-30 border-t border-ink bg-paper pb-[env(safe-area-inset-bottom)] md:hidden">
      <ul className="grid" style={{ gridTemplateColumns: `repeat(${nav.length}, minmax(0, 1fr))` }}>
        {nav.map((n) => {
          const active = path === n.href || path.startsWith(`${n.href}/`);
          return (
            <li key={n.href}>
              <Link
                href={n.href}
                aria-current={active ? "page" : undefined}
                className={cn("flex min-h-[var(--tabbar-h)] flex-col items-center justify-center gap-0.5 border-t-2 text-caption", active ? "-mt-px border-ink font-medium" : "border-transparent text-muted")}
              >
                <Icon name={n.icon} />
                {n.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
