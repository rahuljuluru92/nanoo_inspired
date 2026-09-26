import type { ReactNode } from "react";
import type { WireEvent } from "@/lib/types";
import { BottomTabs } from "./bottom-tabs";
import type { AccountInfo } from "./account-menu";
import { Masthead, type Figure, type NavItem } from "./masthead";

export const BRAND_NAV: NavItem[] = [
  { href: "/desk", label: "Desk", icon: "desk" },
  { href: "/campaigns", label: "Campaigns", icon: "campaigns" },
  { href: "/wire", label: "Wire", icon: "wire" },
  { href: "/wallet", label: "Wallet", icon: "wallet" },
];

export const CREATOR_NAV: NavItem[] = [
  { href: "/offers", label: "Offers", icon: "offers" },
  { href: "/deals", label: "Deals", icon: "deals" },
  { href: "/earnings", label: "Earnings", icon: "earnings" },
  { href: "/kit", label: "Kit", icon: "kit" },
];

/** Masthead + ticker on top, bottom tab bar on phones. Reserve space so content never sits under fixed bars. */
export function AppShell({ nav, figures, wire, unread, account, children }: { nav: NavItem[]; figures?: Figure[]; wire: WireEvent[]; unread?: number; account?: AccountInfo; children: ReactNode }) {
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[70] focus:border focus:border-ink focus:bg-paper-2 focus:px-3 focus:py-2">
        Skip to content
      </a>
      <Masthead nav={nav} figures={figures} wire={wire} unread={unread} account={account} />
      <main id="main" className="mx-auto w-full max-w-[90rem] px-4 pb-[calc(var(--tabbar-h)+env(safe-area-inset-bottom)+4.5rem)] pt-6 md:px-6 lg:pb-16">
        {children}
      </main>
      <BottomTabs nav={nav} />
    </>
  );
}
