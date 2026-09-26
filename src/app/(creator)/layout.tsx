import type { ReactNode } from "react";
import { AppShell, CREATOR_NAV } from "@/components/shell/app-shell";
import { requireRole } from "@/lib/auth";
import { creatorChrome } from "@/lib/queries/chrome";

export default async function CreatorLayout({ children }: { children: ReactNode }) {
  const s = await requireRole("creator", "/offers");
  const chrome = await creatorChrome(s.accountId);
  return (
    <AppShell nav={CREATOR_NAV} figures={chrome.figures} wire={chrome.wire} unread={chrome.unread} account={{ name: s.displayName, email: s.email, role: "creator", isDemo: s.isDemo }}>
      {children}
    </AppShell>
  );
}
