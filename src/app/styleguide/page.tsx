import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Halftone } from "@/components/art/halftone";
import { Wordmark } from "@/components/art/wordmark";
import { FitBar } from "@/components/desk/fit-bar";
import { Receipt } from "@/components/receipt/receipt";
import { RunOfShow } from "@/components/receipt/run-of-show";
import { AppShell, BRAND_NAV } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Dateline } from "@/components/ui/dateline";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkline } from "@/components/ui/sparkline";
import { Stamp } from "@/components/ui/stamp";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Tabs } from "@/components/ui/tabs";
import { WireItem } from "@/components/wire/wire-item";
import type { BookingStatus } from "@/lib/types";
import { CountDemo, DeskDemo, HoldDemo, OverlayDemo } from "./demos";
import { LEDGER, RECEIPT, SHOW, SHOW_RANGE, WIRE } from "./fixtures";

export const metadata: Metadata = { title: "Styleguide", robots: { index: false } };

const STATUSES: BookingStatus[] = ["invited", "accepted", "declined", "drafted", "changes_requested", "approved", "live", "paid", "cancelled"];
const SWATCHES = [
  { token: "--paper", use: "Page", note: "" },
  { token: "--paper-2", use: "Raised: tray, drawer, dialog", note: "" },
  { token: "--ink", use: "Text, rules, outlines", note: "16.5:1 on paper" },
  { token: "--muted", use: "Secondary text", note: "5.1:1 on paper" },
  { token: "--line", use: "Decorative hairlines", note: "1.2:1 — decoration only" },
  { token: "--line-strong", use: "Control borders", note: "3.3:1 (non-text ≥ 3:1)" },
  { token: "--vermilion", use: "Fills: primary button, live dot, hold fill", note: "Ink text on it: 5.6:1. Never white." },
  { token: "--vermilion-ink", use: "Small vermilion text and links", note: "5.0:1 on paper" },
  { token: "--highlight", use: "Selection and emphasis", note: "Ink on it: 13.4:1" },
  { token: "--green", use: "Positive money, verified", note: "8.9:1 on paper" },
];
const HANDLES = ["maya-okafor", "jonas-brandt", "lea-marchetti", "idris-paal", "nora-wilkes", "tomas-ferreira", "anika-rao", "sven-lindqvist", "chloe-vance", "ravi-menon", "elin-holm", "pablo-duarte"];

function Section({ id, n, title, note, children }: { id: string; n: string; title: string; note?: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-32 border-t-2 border-ink py-10">
      <Dateline>
        § {n}
      </Dateline>
      <h2 id={`${id}-h`} className="mt-1 text-display">
        {title}
      </h2>
      {note ? <p className="mt-2 max-w-prose text-small text-muted">{note}</p> : null}
      <div className="mt-8">{children}</div>
    </section>
  );
}

export default function Styleguide() {
  return (
    <AppShell nav={BRAND_NAV} wire={WIRE} unread={2} figures={[{ label: "Wallet", value: "€7,850" }, { label: "Escrow", value: "€4,150" }]}>
      <header className="pb-10 pt-4">
        <Dateline>Styleguide · phase 2 · measured, not assumed</Dateline>
        <h1 className="mt-2 text-display-xl">The Byline design system</h1>
        <p className="mt-4 max-w-prose text-body text-muted">
          Newsprint for the words, trading desk for the numbers. Everything on this page is a real component with its real states. Resize the window: the masthead becomes a bottom tab bar, the tray becomes a sheet, rows become stacked cards.
        </p>
        <nav aria-label="On this page" className="mt-6 flex flex-wrap gap-x-5 gap-y-1 font-mono text-caption">
          {["palette", "type", "actions", "fields", "status", "portraits", "figures", "desk", "hold", "wire", "receipt", "run", "overlays", "table", "states"].map((a) => (
            <a key={a} href={`#${a}`} className="inline-flex min-h-11 items-center underline decoration-line-strong underline-offset-4 hover:decoration-ink">
              {a}
            </a>
          ))}
        </nav>
      </header>

      <Section id="palette" n="01" title="Palette" note="Colour is scarce, so it means something. Vermilion means act or live; highlighter means selected. Every ratio below was measured.">
        <ul className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
          {SWATCHES.map((s) => (
            <li key={s.token} className="flex gap-4">
              <div className="size-16 shrink-0 border border-line-strong" style={{ background: `var(${s.token})` }} aria-hidden="true" />
              <div className="min-w-0">
                <p className="font-mono text-small">{s.token}</p>
                <p className="text-small">{s.use}</p>
                {s.note ? <p className="font-mono text-caption text-muted">{s.note}</p> : null}
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="type" n="02" title="Type" note="Instrument Serif for headlines and numerals, Schibsted Grotesk for the interface, JetBrains Mono for money, counts and datelines. Sentence case throughout.">
        <div className="grid gap-6">
          <p className="text-display-xl">Display XL, fluid</p>
          <p className="text-display">Display, the section headline</p>
          <p className="text-title">Title, the card and panel headline</p>
          <p className="max-w-prose text-body">Body copy in the grotesque at 16 px on a 24 px line. Inputs never drop below 16 px, so iOS doesn&rsquo;t zoom.</p>
          <p className="text-small text-muted">Small: helper text, table cells, secondary lines.</p>
          <p className="font-mono text-caption tracking-[0.04em] text-muted">Caption in mono · Brief № 0042 · filed 26 Sep</p>
          <p className="font-mono text-title tabular-nums">€4,150 · 1.6k–2.7k clicks · €2.29 · 92% fit</p>
          <p className="font-serif text-display italic">Italic for emphasis and the wordmark.</p>
        </div>
      </Section>

      <Section id="actions" n="03" title="Actions" note="Primary is vermilion with ink text; white on vermilion fails contrast. Height is 44 px, or 36 px for dense rows.">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">Add to lineup</Button>
          <Button>Request changes</Button>
          <Button variant="ghost">Read the brief</Button>
          <Button variant="danger">Cancel offer</Button>
          <Button variant="primary" size="sm">
            Small primary
          </Button>
          <Button variant="primary" disabled>
            Disabled
          </Button>
          <Button variant="primary" pending>
            Placing hold
          </Button>
          <Wordmark />
        </div>
      </Section>

      <Section id="fields" n="04" title="Fields" note="Labels are always visible. Errors are announced and tied to their field. Control borders are 3.3:1.">
        <div className="grid max-w-3xl gap-6 sm:grid-cols-2">
          <Field label="Company" hint="As it should appear on receipts.">
            {(p) => <Input placeholder="Halcyon Security" {...p} />}
          </Field>
          <Field label="Destination URL" error="Enter a full link, starting with https://">
            {(p) => <Input defaultValue="halcyon" {...p} />}
          </Field>
          <Field label="Objective">
            {(p) => (
              <Select {...p} defaultValue="demos">
                <option value="demos">Book demos</option>
                <option value="signups">Drive sign-ups</option>
                <option value="awareness">Build awareness</option>
              </Select>
            )}
          </Field>
          <Field label="Key message">{(p) => <Textarea placeholder="What should every post make the reader do?" {...p} />}</Field>
        </div>
      </Section>

      <Section id="status" n="05" title="Chips and stamps" note="Status is carried by the word and the glyph shape, never by colour alone. Live is the only pulsing thing on the page.">
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <Stamp key={s} status={s} />
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Chip>CTOs 61% of audience</Chip>
          <Chip>EU 74%</Chip>
          <Chip>CTR 1.4× vertical median</Chip>
          <Chip tone="green">Verified by redirect</Chip>
          <Chip tone="ink">Sandbox creator</Chip>
        </div>
      </Section>

      <Section id="portraits" n="06" title="Halftone portraits" note="Procedural dot portraits seeded from a handle: unique, deterministic, on-theme, and no real faces anywhere.">
        <div className="flex flex-wrap items-end gap-5">
          {HANDLES.map((h) => (
            <div key={h} className="text-center">
              <Halftone seed={h} size={72} />
              <p className="mt-1 font-mono text-caption text-muted">{h.split("-")[0]}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap items-end gap-5">
          <Halftone seed="maya-okafor" size={28} />
          <Halftone seed="maya-okafor" size={48} />
          <Halftone seed="maya-okafor" size={96} />
          <Halftone seed="maya-okafor" size={160} label="Halftone portrait of Maya Okafor" />
        </div>
      </Section>

      <Section id="figures" n="07" title="Fit, counts and sparklines" note="Every score shows its reasons. Numbers count up; under reduced motion they simply change.">
        <div className="grid max-w-3xl gap-8 sm:grid-cols-3">
          <FitBar score={92} />
          <FitBar score={64} />
          <FitBar score={31} />
        </div>
        <div className="mt-8 grid items-center gap-8 sm:grid-cols-[auto_auto] sm:justify-start sm:gap-12">
          <CountDemo />
          <Sparkline data={[12, 44, 96, 140, 120, 90, 61, 48]} width={160} height={40} label="Clicks by day, peaking on day four" />
        </div>
      </Section>

      <Section id="desk" n="08" title="The desk" note="The brief is the search: change any slot and the lineup re-ranks. Add creators to see the projection and the escrow before you commit. Demo data and a demo scorer; the real logic lands in Phase 4.">
        <DeskDemo />
      </Section>

      <Section id="hold" n="09" title="Hold to commit" note="Press and hold to move money into escrow. Enter or Space opens a confirm dialog with the same summary, and reduced-motion users get the dialog on a plain click.">
        <HoldDemo />
      </Section>

      <Section id="wire" n="10" title="The Wire" note="The ticker sits under the masthead on every page. Below, the full feed. Times render in your own timezone.">
        <ol className="max-w-3xl border-b border-line">
          {WIRE.map((e) => (
            <WireItem key={e.id} event={e} />
          ))}
        </ol>
      </Section>

      <Section id="receipt" n="11" title="Receipt" note="Public, unlisted proof of a post. It says what is verified (clicks) and what is self-reported (impressions).">
        <Receipt data={RECEIPT} />
      </Section>

      <Section id="run" n="12" title="Run-of-show" note="A campaign as a calendar on desktop; an agenda list on phones.">
        <RunOfShow items={SHOW} rangeStart={SHOW_RANGE.start} rangeEnd={SHOW_RANGE.end} today={SHOW_RANGE.today} />
      </Section>

      <Section id="overlays" n="13" title="Overlays and feedback" note="Dialog, drawer, bottom sheet, popover and toast. Focus is trapped and restored; Esc closes; toasts announce politely.">
        <OverlayDemo />
        <Tabs
          className="mt-10 max-w-2xl"
          tabs={[
            { value: "draft", label: "Draft", content: <p className="text-small text-muted">The creator&rsquo;s draft, with the brand&rsquo;s notes beside it.</p> },
            { value: "timeline", label: "Timeline", content: <p className="text-small text-muted">Every event on this booking, newest first.</p> },
            { value: "receipt", label: "Receipt", content: <p className="text-small text-muted">Final once the payout is released.</p> },
          ]}
        />
      </Section>

      <Section id="table" n="14" title="Table" note="Hairline rules, mono figures aligned right. Wide tables scroll inside their own region, never the page.">
        <Table caption="Wallet ledger">
          <THead>
            <TR>
              <TH>When</TH>
              <TH>Kind</TH>
              <TH>Reference</TH>
              <TH num>Amount</TH>
              <TH num>Balance</TH>
            </TR>
          </THead>
          <TBody>
            {LEDGER.map((r) => (
              <TR key={r.at}>
                <TD className="whitespace-nowrap font-mono">{r.at}</TD>
                <TD>{r.kind}</TD>
                <TD>{r.ref}</TD>
                <TD num>{r.amount}</TD>
                <TD num>{r.balance}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Section>

      <Section id="states" n="15" title="Loading and empty" note="Skeletons are hatched paper, not grey shimmer. Empty states name the space and offer a verb.">
        <div className="grid gap-10 lg:grid-cols-2">
          <div role="status" aria-busy="true" className="space-y-4">
            <span className="sr-only">Loading lineup…</span>
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/5" />
                  <Skeleton className="h-3 w-4/5" />
                </div>
              </div>
            ))}
          </div>
          <EmptyState level={3} title="Write your first brief" body="Say who you want to reach and what you can spend. The lineup assembles as you type." action={<Button variant="primary">Open the desk</Button>} />
        </div>
      </Section>
    </AppShell>
  );
}
