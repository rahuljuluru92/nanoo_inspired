import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Wordmark } from "@/components/art/wordmark";
import { ProfileForm } from "@/components/creator/profile-form";
import { Dateline } from "@/components/ui/dateline";
import { requireRole } from "@/lib/auth";
import { asUser } from "@/lib/db";
import { slugify } from "@/lib/profile";

export const metadata: Metadata = { title: "Set up your kit" };

export default async function Onboarding() {
  const s = await requireRole("creator", "/onboarding");
  const has = await asUser(s.accountId, async (c) => (await c.query("select 1 from creators")).rowCount ?? 0);
  if (has) redirect("/offers");
  return (
    <main className="mx-auto min-h-dvh max-w-2xl px-6 py-10">
      <Wordmark />
      <Dateline className="mt-10">Creator desk · step 1 of 1</Dateline>
      <h1 className="mt-1 text-display">Set up your media kit.</h1>
      <p className="mt-3 max-w-prose text-small text-muted">Two minutes. You set your price; brands see it before they book. Everything here can be changed later.</p>
      <div className="mt-8">
        <ProfileForm
          mode="onboarding"
          initial={{ displayName: s.displayName, handle: slugify(s.displayName), headline: "", bio: "", country: "", verticals: [], followers: "", rateEuros: "", typicalImpressions: "", roles: [], geo: [] }}
        />
      </div>
    </main>
  );
}
