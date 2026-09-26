import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Halftone } from "@/components/art/halftone";
import { Wordmark } from "@/components/art/wordmark";
import { ButtonLink } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Dateline } from "@/components/ui/dateline";
import { asAnon } from "@/lib/db";
import { projectClicks } from "@/lib/projection";
import { costPerClickCents, formatCount, formatEUR, formatEUR2, formatRange } from "@/lib/money";
import { sharesToMix } from "@/lib/profile";
import { formatDay } from "@/lib/time";

interface Kit {
  id: string;
  handle: string;
  display_name: string;
  headline: string;
  bio: string;
  country: string | null;
  verticals: string[];
  followers: number;
  rate_cents: number;
  imp_p25: number;
  imp_p50: number;
  imp_p75: number;
  ctr_p50: string;
  is_sandbox: boolean;
  audience: { roles?: Record<string, number>; geo?: Record<string, number> };
}
interface Post {
  hook: string;
  impressions: number;
  clicks: number;
  published_at: Date;
}
interface Rcpt {
  code: string;
  campaign_title: string;
  brand_name: string;
  clicks_unique: string;
  price_cents: number;
  paid_at: Date | null;
}

async function load(handle: string) {
  return asAnon(async (c) => {
    const k = await c.query<Kit>(
      `select id, handle, display_name, headline, bio, country, verticals, followers, rate_cents, imp_p25, imp_p50, imp_p75, ctr_p50, is_sandbox, audience
         from public_creators where handle = $1`,
      [handle],
    );
    const kit = k.rows[0];
    if (!kit) return null;
    const posts = await c.query<Post>("select hook, impressions, clicks, published_at from creator_posts where creator_id = $1 order by published_at desc limit 6", [kit.id]);
    const rc = await c.query<Rcpt>("select code, campaign_title, brand_name, clicks_unique, price_cents, paid_at from public_receipts where handle = $1 and status = 'paid' order by paid_at desc limit 6", [handle]);
    return { kit, posts: posts.rows, receipts: rc.rows };
  });
}

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const { handle } = await params;
  const d = await load(handle);
  return d ? { title: d.kit.display_name, description: `${d.kit.display_name}: ${d.kit.headline}` } : { title: "Creator not found" };
}

function Bars({ title, shares }: { title: string; shares: Record<string, number> | undefined }) {
  const rows = sharesToMix(shares);
  if (!rows.length) return null;
  return (
    <div>
      <h3 className="font-mono text-caption font-normal text-muted">{title}</h3>
      <ul className="mt-2 grid gap-2">
        {rows.map((r) => (
          <li key={r.tag} className="grid grid-cols-[minmax(0,9rem)_1fr_2.5rem] items-center gap-3 text-small">
            <span className="truncate">{r.tag}</span>
            <span role="meter" aria-label={`${r.tag} ${r.pct} percent`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={r.pct} className="h-1 bg-line">
              <span className="block h-1 bg-ink" style={{ width: `${r.pct}%` }} />
            </span>
            <span className="text-right font-mono tabular-nums">{r.pct}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function PublicKit({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const d = await load(handle);
  if (!d) notFound();
  const { kit, posts, receipts } = d;
  const proj = projectClicks(kit.imp_p25, kit.imp_p50, kit.imp_p75, Number(kit.ctr_p50));

  return (
    <main className="mx-auto min-h-dvh max-w-4xl px-4 pb-20 pt-6 sm:px-6">
      <header className="flex items-center justify-between border-b border-ink pb-2">
        <Wordmark />
        <Link href="/login" className="inline-flex min-h-11 items-center text-small underline decoration-line-strong underline-offset-4 hover:decoration-ink">
          Sign in
        </Link>
      </header>

      <section className="mt-10 grid gap-8 sm:grid-cols-[auto_1fr] sm:gap-10">
        <Halftone seed={kit.handle} size={132} label={`Halftone portrait of ${kit.display_name}`} />
        <div>
          <Dateline>Media kit · {kit.country ?? "—"}</Dateline>
          <h1 className="mt-1 text-display-xl">{kit.display_name}</h1>
          <p className="mt-2 max-w-prose text-body">{kit.headline}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {kit.verticals.map((v) => (
              <Chip key={v}>{v}</Chip>
            ))}
            {kit.is_sandbox ? <Chip tone="ink">Sandbox creator</Chip> : null}
          </div>
          {kit.bio ? <p className="mt-4 max-w-prose text-small text-muted">{kit.bio}</p> : null}
        </div>
      </section>

      <dl className="mt-10 grid grid-cols-2 gap-x-8 gap-y-6 border-y border-line py-6 sm:grid-cols-4">
        <div>
          <dt className="font-mono text-caption text-muted">Rate per post</dt>
          <dd className="font-serif text-display tabular-nums">{formatEUR(kit.rate_cents)}</dd>
        </div>
        <div>
          <dt className="font-mono text-caption text-muted">Followers</dt>
          <dd className="font-serif text-display tabular-nums">{formatCount(kit.followers)}</dd>
        </div>
        <div>
          <dt className="font-mono text-caption text-muted">Typical impressions</dt>
          <dd className="font-serif text-display tabular-nums">{formatCount(kit.imp_p50)}</dd>
        </div>
        <div>
          <dt className="font-mono text-caption text-muted">Est. clicks per post</dt>
          <dd className="font-serif text-display tabular-nums">{formatRange(proj.low, proj.high)}</dd>
        </div>
      </dl>
      <p className="mt-2 text-caption text-muted">Followers, impressions and audience are reported by the creator. Only clicks on Receipts are verified by Byline.</p>

      <section className="mt-10 grid gap-8 sm:grid-cols-2" aria-label="Audience">
        <Bars title="Audience by role · self-reported" shares={kit.audience.roles} />
        <Bars title="Audience by country · self-reported" shares={kit.audience.geo} />
      </section>

      <section className="mt-12" aria-labelledby="receipts">
        <h2 id="receipts" className="text-title">
          Verified receipts
        </h2>
        {receipts.length === 0 ? (
          <p className="mt-2 max-w-prose text-small text-muted">No paid campaigns yet. Every post booked through Byline adds a Receipt here, with clicks counted by our tracked link.</p>
        ) : (
          <ul className="mt-4 border-b border-line">
            {receipts.map((r) => {
              const cpc = costPerClickCents(r.price_cents, Number(r.clicks_unique));
              return (
                <li key={r.code} className="border-t border-line">
                  <Link href={`/receipt/${r.code}`} className="grid gap-1 py-3 hover:bg-highlight/20 sm:grid-cols-[1fr_auto] sm:items-baseline sm:px-2">
                    <span className="font-serif text-[1.25rem] leading-tight">
                      {r.campaign_title} <span className="font-sans text-small text-muted">for {r.brand_name}</span>
                    </span>
                    <span className="font-mono text-small tabular-nums">
                      {Number(r.clicks_unique).toLocaleString("en-IE")} unique clicks · {cpc === null ? "—" : formatEUR2(cpc)} per click
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-12" aria-labelledby="posts">
        <h2 id="posts" className="text-title">
          Recent posts
        </h2>
        <ul className="mt-4 border-b border-line">
          {posts.map((p, i) => (
            <li key={i} className="grid gap-1 border-t border-line py-3 sm:grid-cols-[1fr_auto] sm:items-baseline sm:gap-6">
              <span>{p.hook}</span>
              <span className="font-mono text-caption tabular-nums text-muted">
                {formatDay(p.published_at.toISOString())} · {p.impressions.toLocaleString("en-IE")} impressions · {p.clicks.toLocaleString("en-IE")} clicks
              </span>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-12 flex flex-wrap items-center gap-4 border-t-2 border-ink pt-6">
        <ButtonLink href="/login?next=/desk" variant="primary">
          Book {kit.display_name.split(" ")[0]} for a campaign
        </ButtonLink>
        <p className="text-small text-muted">From {formatEUR(kit.rate_cents)} per post. Funds are held in escrow until the post is live.</p>
      </div>
    </main>
  );
}
