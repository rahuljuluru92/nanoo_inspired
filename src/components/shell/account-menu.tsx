"use client";

import { logoutAction, resetDemoAction } from "@/app/login/actions";
import { Popover } from "@/components/ui/popover";
import { SubmitButton } from "@/components/ui/submit-button";
import { Dateline } from "@/components/ui/dateline";

export interface AccountInfo {
  name: string;
  email: string;
  role: "brand" | "creator";
  isDemo: boolean;
}

/** Who you are, reset-the-demo (demo accounts only) and sign out. */
export function AccountMenu({ account }: { account: AccountInfo }) {
  const initials = account.name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <Popover
      label="Account"
      trigger={
        <button type="button" aria-label={`Account menu for ${account.name}`} className="inline-flex size-11 items-center justify-center rounded-full border border-ink font-mono text-caption hover:bg-ink hover:text-paper">
          {initials || "?"}
        </button>
      }
      className="w-[min(92vw,18rem)] p-4"
    >
      <Dateline>{account.role === "brand" ? "Brand desk" : "Creator desk"}</Dateline>
      <p className="mt-1 font-serif text-title leading-tight">{account.name}</p>
      <p className="break-all text-small text-muted">{account.email}</p>
      <div className="mt-4 grid gap-2">
        {account.isDemo ? (
          <form action={resetDemoAction}>
            <SubmitButton size="sm" variant="secondary" className="w-full">
              Reset demo data
            </SubmitButton>
            <p className="mt-1 text-caption text-muted">Restores the seeded campaigns, wallet and offers.</p>
          </form>
        ) : null}
        <form action={logoutAction}>
          <SubmitButton size="sm" variant="ghost" className="w-full">
            Sign out
          </SubmitButton>
        </form>
      </div>
    </Popover>
  );
}
