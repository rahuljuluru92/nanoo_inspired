import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/creator/profile-form";
import { Dateline } from "@/components/ui/dateline";
import { requireRole } from "@/lib/auth";
import { asUser } from "@/lib/db";
import { sharesToMix } from "@/lib/profile";

export const metadata: Metadata = { title: "Media kit" };

interface Row {
  display_name: string;
  handle: string;
  headline: string;
  bio: string;
  country: string | null;
  verticals: string[];
  followers: number;
  rate_cents: number;
  imp_p50: number;
  audience: { roles?: Record<string, number>; geo?: Record<string, number> };
}

export default async function Kit() {
  const s = await requireRole("creator", "/kit");
  const { rows } = await asUser(s.accountId, (c) => c.query<Row>("select display_name, handle, headline, bio, country, verticals, followers, rate_cents, imp_p50, audience from creators"));
  const r = rows[0];
  if (!r) redirect("/onboarding");
  return (
    <div className="max-w-2xl">
      <Dateline>Media kit</Dateline>
      <h1 className="mt-1 text-display">Your kit</h1>
      <p className="mt-3 text-small text-muted">This is what brands see when they find you. Your public page updates the moment you save.</p>
      <div className="mt-8">
        <ProfileForm
          mode="kit"
          initial={{
            displayName: r.display_name,
            handle: r.handle,
            headline: r.headline,
            bio: r.bio,
            country: r.country ?? "",
            verticals: r.verticals,
            followers: String(r.followers),
            rateEuros: String(Math.round(r.rate_cents / 100)),
            typicalImpressions: String(r.imp_p50),
            roles: sharesToMix(r.audience.roles),
            geo: sharesToMix(r.audience.geo),
          }}
        />
      </div>
    </div>
  );
}
