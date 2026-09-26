"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wordmark } from "@/components/art/wordmark";
import { Icon, type IconName } from "@/components/ui/icon";
import { Ticker } from "@/components/wire/ticker";
import { cn } from "@/lib/cn";
import { AccountMenu, type AccountInfo } from "./account-menu";
import type { WireEvent } from "@/lib/types";

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
}

export interface Figure {
  label: string;
  value: string;
}

/** Top masthead (wordmark · nav · figures · bell) with the Wire ticker strip beneath it. No left rail. */
export function Masthead({ nav, figures = [], wire, unread = 0, account }: { nav: NavItem[]; figures?: Figure[]; wire: WireEvent[]; unread?: number; account?: AccountInfo }) {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-30 border-b border-ink bg-paper">
      <div className="mx-auto flex h-[var(--masthead-h)] max-w-[90rem] items-center gap-6 px-4 md:px-6">
        <Wordmark />
        <nav aria-label="Primary" className="hidden items-stretch self-stretch md:flex">
          {nav.map((n) => {
            const active = path === n.href || path.startsWith(`${n.href}/`);
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active ? "page" : undefined}
                className={cn("flex items-center border-b-2 px-3 text-small", active ? "border-ink font-medium" : "border-transparent text-muted hover:text-ink")}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-5">
          {figures.length ? (
            <dl className="hidden items-baseline gap-5 font-mono text-small tabular-nums sm:flex">
              {figures.map((f) => (
                <div key={f.label} className="flex items-baseline gap-1.5">
                  <dt className="text-caption text-muted">{f.label}</dt>
                  <dd>{f.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          <button type="button" aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"} className="relative -mr-3 inline-flex size-11 items-center justify-center hover:text-vermilion-ink">
            <Icon name="bell" />
            {unread ? <span aria-hidden="true" className="absolute right-2.5 top-2.5 size-2 rounded-full bg-vermilion" /> : null}
          </button>
          {account ? <AccountMenu account={account} /> : null}
        </div>
      </div>
      <Ticker events={wire} />
    </header>
  );
}
