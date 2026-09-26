import type { Metadata } from "next";
import Link from "next/link";
import { Wordmark } from "@/components/art/wordmark";
import { FitBar } from "@/components/desk/fit-bar";
import { LiveDesk } from "@/components/landing/live-desk";
import { Receipt } from "@/components/receipt/receipt";
import { ButtonLink } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Dateline } from "@/components/ui/dateline";
import { asAnon } from "@/lib/db";
import { getLineup } from "@/lib/lineup";
import { formatEUR } from "@/lib/money";
import { loadFeaturedReceipt, toReceiptData } from "@/lib/queries/receipts";
import type { BriefValue } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "Byline — the wire desk for B2B creator campaigns" },
  description: "Write one sentence about who you want to reach. Byline ranks B2B creators by audience fit, shows what each should deliver before you spend, and keeps the receipt.",
};

const EXAMPLE: BriefValue = { product: "a SOC 2 automation tool", buyers: ["CTOs", "Security leads"], verticals: ["Fintech"], geo: ["France", "Germany"], budgetCents: 600000 };

const STEPS = [
  { n: "01", noun: "Brief", body: "One sentence with editable parts. The brief is the search: change a word and the ranking moves." },
  { n: "02", noun: "Lineup", body: "Every creator gets a fit score you can take apart: audience, vertical, geography, performance." },
  { n: "03", noun: "Wire", body: "Offers, drafts, go-lives and clicks arrive the moment they happen, on every page." },
  { n: "04", noun: "Receipt", body: "A public proof of each post. It counts people, not crawlers, and says what it can’t vouch for." },
] as const;

const SAMPLE_WIRE = ["14:02 · Maya accepted · Launch Q4", "14:09 · Draft approved · Maya · Launch Q4", "14:31 · +3 clicks · Maya · Launch Q4"];

const FAQ: { q: string; a: string }[] = [
  { q: "Are these real creators?", a: "No. Every creator here is fictional, and so is every brand. The maths is real: the fit scores, the projections, the escrow ledger, the tracked links and the Receipts all run on a real database." },
  { q: "How is the fit score worked out?", a: "Forty per cent is how much of the creator’s audience is the buyers you named, twenty-five is vertical overlap, twenty is geography, and fifteen is how their click-through rate compares with others in the same vertical. Each score lists its strongest reasons, so it is never a black box." },
  { q: "How do you know the clicks are real?", a: "Every post gets its own tracked link. Byline records who arrives, ignores crawlers and link previews, counts one visitor once a day, and never stores an IP address. Impressions are reported by the creator, and the Receipt labels them that way." },
  { q: "What happens to my money?", a: "When you place a hold, the price of each post moves from your wallet into escrow. It leaves escrow only when you release it after the post is live, or comes back to you if an offer is declined or cancelled. Today this is test mode: no card is charged and no bank moves money." },
  { q: "Can I try it without an account?", a: "Yes. The live desk above needs nothing. To go further, enter as the demo brand or the demo creator and use the whole product, or read the public API in the developer notes." },
  { q: "What isn’t built?", a: "Real payments, any connection to LinkedIn, contracts and invoices, and email. Audience and reach figures are self-reported. The product is honest about each of those wherever it shows a number." },
];

export default async function Home() {
  let initial: Awaited<ReturnType<typeof getLineup>> | null = null;
  let featured = null;
  let stats = { creators: 0, min: 0, max: 0 };
  try {
    const [lineup, rc, st] = await Promise.all([
      getLineup(EXAMPLE, 6),
      loadFeaturedReceipt(),
      asAnon((c) => c.query<{ n: string; min: number; max: number }>("select count(*) as n, min(rate_cents) as min, max(rate_cents) as max from public_creators")),
    ]);
    initial = lineup;
    featured = rc;
    stats = { creators: Number(st.rows[0]?.n ?? 0), min: st.rows[0]?.min ?? 0, max: st.rows[0]?.max ?? 0 };
  } catch {
    // The page still renders; the live desk shows its own error state with a retry.
  }

  return (
    <div className="mx-auto max-w-[80rem] px-4 sm:px-6">
      <header className="flex items-center justify-between gap-4 border-b border-ink py-2">
        <Wordmark />
        <nav aria-label="Sections" className="hidden items-center gap-6 text-small md:flex">
          {[["#how", "How it works"], ["#creators", "For creators"], ["#pricing", "Pricing"], ["#faq", "Questions"]].map(([href, label]) => (
            <a key={href} href={href} className="inline-flex min-h-11 items-center text-muted hover:text-ink">
              {label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/login" className="inline-flex min-h-11 items-center text-small underline decoration-line-strong underline-offset-4 hover:decoration-ink">
            Sign in
          </Link>
          <ButtonLink href="/login" variant="primary">
            Try the demo
          </ButtonLink>
        </div>
      </header>

      <main id="main">
        <section className="pb-14 pt-10 sm:pt-14" aria-labelledby="hero">
          <Dateline>{stats.creators ? `Vol. 1 · ${stats.creators} creators on the roster · ${formatEUR(stats.min)} to ${formatEUR(stats.max)} a post` : "Vol. 1 · The wire desk for B2B creator campaigns"}</Dateline>
          <h1 id="hero" className="mt-3 max-w-5xl text-display-xl">
            Your buyers read people, not brands. <span className="italic">Book those people.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-body text-muted">
            Write one sentence about who you want to reach. Byline ranks B2B creators by how well their audience fits, shows what each should deliver before you spend anything, and keeps the receipt when the post is done.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
            <ButtonLink href="/login" variant="primary">
              Enter as the demo brand
            </ButtonLink>
            <Link href="/join?role=creator" className="inline-flex min-h-11 items-center underline decoration-line-strong underline-offset-4 hover:decoration-ink">
              I’m a creator
            </Link>
          </div>
          <div className="mt-12">
            <LiveDesk initialBrief={EXAMPLE} initial={initial} />
          </div>
        </section>

        <section id="how" aria-labelledby="how-h" className="scroll-mt-4 border-t-2 border-ink py-14">
          <Dateline>How it works</Dateline>
          <h2 id="how-h" className="mt-2 max-w-3xl text-display">
            Four steps, four words.
          </h2>
          <ol className="mt-10 grid border-t border-line sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <li key={s.noun} className="border-b border-line py-6 sm:pr-6 lg:border-b-0 lg:border-r lg:pl-6 lg:first:pl-0 lg:last:border-r-0">
                <p className="font-serif text-[2.25rem] italic leading-none text-muted">{s.n}</p>
                <h3 className="mt-3 font-serif text-title">{s.noun}</h3>
                <p className="mt-2 text-small text-muted">{s.body}</p>
                {s.noun === "Brief" ? <p className="mt-4 font-serif text-[1.15rem] leading-snug">I’m launching <span className="shadow-[inset_0_-0.4em_0_var(--highlight)]">a tool</span> to <span className="shadow-[inset_0_-0.4em_0_var(--highlight)]">CTOs</span>…</p> : null}
                {s.noun === "Lineup" ? (
                  <div className="mt-4 max-w-56">
                    <FitBar score={93} />
                    <div className="mt-2 flex flex-wrap gap-1">
                      <Chip>CTOs 61% of audience</Chip>
                      <Chip>France 74%</Chip>
                    </div>
                  </div>
                ) : null}
                {s.noun === "Wire" ? (
                  <ul className="mt-4 grid gap-1 font-mono text-caption text-muted" aria-label="Sample wire lines">
                    {SAMPLE_WIRE.map((l) => (
                      <li key={l}>{l}</li>
                    ))}
                  </ul>
                ) : null}
                {s.noun === "Receipt" ? (
                  <a href="#proof" className="mt-4 inline-flex min-h-11 items-center text-small underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                    See a real one ↓
                  </a>
                ) : null}
              </li>
            ))}
          </ol>
        </section>

        {featured ? (
          <section id="proof" aria-labelledby="proof-h" className="scroll-mt-4 border-t-2 border-ink py-14">
            <Dateline>Proof, not promises</Dateline>
            <h2 id="proof-h" className="mt-2 max-w-3xl text-display">
              A receipt from the demo world.
            </h2>
            <p className="mt-3 max-w-prose text-small text-muted">This one is live data: the clicks were counted by a tracked link, and the fee moved from escrow to the creator. Open it, or check the creator’s kit.</p>
            <div className="mt-8">
              <Receipt data={toReceiptData(featured)} as="h3" />
              <p className="mx-auto mt-4 max-w-[45rem] text-small">
                <Link href={`/receipt/${featured.code}`} className="underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                  Open this Receipt as its own page
                </Link>{" "}
                ·{" "}
                <Link href={`/c/${featured.handle}`} className="underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                  {featured.creator_name}’s media kit
                </Link>
              </p>
            </div>
          </section>
        ) : null}

        <section id="creators" aria-labelledby="cr-h" className="scroll-mt-4 border-t-2 border-ink py-14">
          <div className="grid gap-10 lg:grid-cols-[1fr_1fr]">
            <div>
              <Dateline>For creators</Dateline>
              <h2 id="cr-h" className="mt-2 text-display">
                Set your price. Keep all of it.
              </h2>
              <p className="mt-4 max-w-prose text-body text-muted">You decide what a post costs. Brands see the number before they book, the money is in escrow before you write a word, and you are paid when they approve.</p>
              <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
                <ButtonLink href="/join?role=creator" variant="primary">
                  Join as a creator
                </ButtonLink>
                <Link href="/c/maya-okafor" className="inline-flex min-h-11 items-center underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                  See a sample kit
                </Link>
              </div>
            </div>
            <ul className="grid content-start border-t border-line">
              {[
                ["Your rate, your call.", "Brands book at the price you set. No negotiating, no haggling over a rate card."],
                ["Escrow first.", "The fee is held before you start. You never chase an invoice."],
                ["A kit that fills itself.", "Every paid post adds a Receipt to your public page: proof that travels."],
              ].map(([t, b]) => (
                <li key={t} className="border-b border-line py-4">
                  <p className="font-serif text-[1.35rem] leading-tight">{t}</p>
                  <p className="mt-1 text-small text-muted">{b}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="pricing" aria-labelledby="pr-h" className="scroll-mt-4 border-t-2 border-ink py-14">
          <Dateline>Pricing</Dateline>
          <h2 id="pr-h" className="mt-2 max-w-3xl text-display">
            Free while we test.
          </h2>
          <dl className="mt-8 max-w-4xl border-t border-ink">
            {[
              ["Platform fee", "€0 during the beta."],
              ["Creator fee", "Each creator’s flat price per post, shown before you book. Never per click, never per impression."],
              ["Payments", "Test mode. Top-ups are ledger entries, no card is charged, and funds sit in escrow until you release them."],
            ].map(([k, v]) => (
              <div key={k} className="grid gap-1 border-b border-line py-4 sm:grid-cols-[12rem_1fr] sm:gap-8">
                <dt className="font-mono text-small text-muted">{k}</dt>
                <dd className="font-serif text-[1.35rem] leading-snug">{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section id="faq" aria-labelledby="faq-h" className="scroll-mt-4 border-t-2 border-ink py-14">
          <Dateline>Questions</Dateline>
          <h2 id="faq-h" className="mt-2 max-w-3xl text-display">
            The honest answers.
          </h2>
          <div className="mt-8 max-w-3xl border-t border-ink">
            {FAQ.map((f) => (
              <details key={f.q} className="group border-b border-line">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 py-3 font-serif text-[1.3rem] leading-tight [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span aria-hidden="true" className="font-mono text-body transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="max-w-prose pb-4 text-small text-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t-2 border-ink py-10">
        <div className="grid gap-8 sm:grid-cols-[1fr_auto_auto_auto] sm:gap-12">
          <div>
            <Wordmark />
            <p className="mt-3 max-w-xs text-caption text-muted">Fictional data, real mechanics, test mode. Built in the open.</p>
          </div>
          {[
            ["Product", [["Live desk", "#live-desk"], ["How it works", "#how"], ["Pricing", "#pricing"]]],
            ["Build", [["Developers", "/developers"], ["Design system", "/styleguide"], ["Source", "https://github.com/rahuljuluru92/nanoo_inspired"]]],
            ["Account", [["Sign in", "/login"], ["Join", "/join"], ["Join as a creator", "/join?role=creator"]]],
          ].map(([h, links]) => (
            <nav key={h as string} aria-label={h as string}>
              <p className="font-mono text-caption text-muted">{h as string}</p>
              <ul className="mt-2 grid">
                {(links as string[][]).map(([l, href]) => (
                  <li key={l}>
                    <a href={href} className="inline-flex min-h-11 items-center text-small hover:underline">
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </footer>
    </div>
  );
}
