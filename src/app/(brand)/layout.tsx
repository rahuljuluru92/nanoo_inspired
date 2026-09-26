import type { ReactNode } from "react";
import { AppShell, BRAND_NAV } from "@/components/shell/app-shell";
import { requireRole } from "@/lib/auth";
import { brandChrome } from "@/lib/queries/chrome";

export default async function BrandLayout({ children }: { children: ReactNode }) {
  const s = await requireRole("brand", "/desk");
  const chrome = await brandChrome(s.accountId);
  return (
    <AppShell nav={BRAND_NAV} figures={chrome.figures} wire={chrome.wire} unread={chrome.unread} account={{ name: s.displayName, email: s.email, role: "brand", isDemo: s.isDemo }}>
      {children}
    </AppShell>
  );
}
