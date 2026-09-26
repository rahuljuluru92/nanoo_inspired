"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { BriefSentence } from "@/components/desk/brief-sentence";
import { RosterRow } from "@/components/desk/roster-row";
import { Tray } from "@/components/desk/tray";
import { Dateline } from "@/components/ui/dateline";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { rankLineup, type CatalogCreator } from "@/lib/fit";
import { formatEUR } from "@/lib/money";
import { OPTIONS } from "@/lib/taxonomy";
import { formatDay } from "@/lib/time";
import type { BriefValue } from "@/lib/types";
import { commitLineup, topUpAction } from "./actions";

const URL_RE = /^https?:\/\/\S+\.\S+$/i;

function suggestTitle(product: string): string {
  const p = product.trim().replace(/^(a|an|the)\s+/i, "");
  return p ? `${p.charAt(0).toUpperCase()}${p.slice(1)} launch` : "";
}

const inDays = (iso: string, days: number) => new Date(new Date(iso).getTime() + days * 86_400_000).toISOString().slice(0, 10);

export function DeskClient({
  creators,
  walletCents,
  briefNumber,
  today,
  initialBrief,
  isExample,
}: {
  creators: CatalogCreator[];
  walletCents: number;
  briefNumber: number;
  today: string;
  initialBrief: BriefValue;
  isExample: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [brief, setBrief] = useState<BriefValue>(initialBrief);
  const [edited, setEdited] = useState(!isExample);
  const [picked, setPicked] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [d, setD] = useState({ title: "", url: "", objective: "demos", keyMessages: "", guidelines: "", publishBy: inDays(today, 21) });

  const lineup = useMemo(() => rankLineup(creators, brief), [creators, brief]);
  const chosen = lineup.filter((c) => picked.includes(c.id));
  const total = chosen.reduce((a, c) => a + c.rateCents, 0);
  const remaining = Math.max(0, brief.budgetCents - total);

  const title = d.title.trim() || suggestTitle(brief.product);
  const errors = {
    title: title.length < 3 ? "Give the campaign a title of at least 3 characters." : "",
    url: URL_RE.test(d.url.trim()) ? "" : "Enter a full link, starting with https://",
  };
  const ready = !errors.title && !errors.url;
  const blockedReason = ready ? undefined : "Add a campaign title and a destination link first. Every tracked link points to that page.";

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const setDetail = <K extends keyof typeof d>(k: K, v: (typeof d)[K]) => setD((x) => ({ ...x, [k]: v }));

  return (
    <div>
      <Dateline>{`Brief № ${String(briefNumber).padStart(4, "0")} · filed ${formatDay(today)}`}</Dateline>
      <div className="mt-2">
        <BriefSentence
          as="h1"
          value={brief}
          options={OPTIONS}
          onChange={(v) => {
            setBrief(v);
            setEdited(true);
          }}
        />
      </div>
      {!edited ? <p className="mt-3 text-small text-muted">This is an example brief. Click any highlighted part to make it yours.</p> : null}

      <details open={open} onToggle={(e) => setOpen(e.currentTarget.open)} className="group mt-6 border-y border-line">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 py-2 [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-2 font-medium">
            <Icon name="chevron" size={16} className="transition-transform group-open:rotate-90" />
            Campaign details
          </span>
          <span className={ready ? "font-mono text-caption text-green" : "font-mono text-caption text-muted"}>{ready ? "Ready to commit" : "Title and destination link needed"}</span>
        </summary>
        <div className="grid gap-5 pb-6 pt-3 sm:grid-cols-2">
          <Field label="Campaign title" hint={d.title.trim() ? undefined : "Defaults to your product; edit if you like."} error={showErrors ? errors.title : undefined}>
            {(p) => <Input value={d.title} placeholder={suggestTitle(brief.product) || "e.g. Q4 launch"} onChange={(e) => setDetail("title", e.target.value)} maxLength={80} {...p} />}
          </Field>
          <Field label="Destination link" hint="Where every tracked click lands." error={showErrors ? errors.url : undefined}>
            {(p) => <Input type="url" inputMode="url" value={d.url} placeholder="https://yourcompany.com/landing" onChange={(e) => setDetail("url", e.target.value)} {...p} />}
          </Field>
          <Field label="Objective">
            {(p) => (
              <Select value={d.objective} onChange={(e) => setDetail("objective", e.target.value)} {...p}>
                <option value="demos">Book demos</option>
                <option value="signups">Drive sign-ups</option>
                <option value="awareness">Build awareness</option>
              </Select>
            )}
          </Field>
          <Field label="Publish by">{(p) => <Input type="date" value={d.publishBy} min={inDays(today, 0)} onChange={(e) => setDetail("publishBy", e.target.value)} {...p} />}</Field>
          <Field label="Key message" hint="What every post should make the reader do." className="sm:col-span-2">
            {(p) => <Textarea value={d.keyMessages} maxLength={2000} placeholder="SOC 2 in six weeks, not six months." onChange={(e) => setDetail("keyMessages", e.target.value)} {...p} />}
          </Field>
          <Field label="Guidelines for creators" className="sm:col-span-2">
            {(p) => <Textarea value={d.guidelines} maxLength={2000} placeholder="Write in your own voice. One clear next step." onChange={(e) => setDetail("guidelines", e.target.value)} {...p} />}
          </Field>
        </div>
      </details>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22.5rem]">
        <section aria-label="Lineup">
          <div className="flex items-baseline justify-between border-b border-ink pb-2 font-mono text-caption text-muted">
            <span>{`Lineup · sorted by fit · ${lineup.length} creators`}</span>
            <span className="hidden sm:inline">fit · €/post · est. clicks</span>
          </div>
          <ul>
            {lineup.map((c) => (
              <RosterRow
                key={c.id}
                creator={c}
                selected={picked.includes(c.id)}
                overBudgetCents={!picked.includes(c.id) && brief.budgetCents > 0 && c.rateCents > remaining ? c.rateCents - remaining : 0}
                onToggle={() => toggle(c.id)}
              />
            ))}
          </ul>
        </section>

        <Tray
          items={chosen.map((c) => ({ handle: c.handle, name: c.name, priceCents: c.rateCents, projection: c.projection }))}
          budgetCents={brief.budgetCents}
          walletCents={walletCents}
          onRemove={(handle) => setPicked((p) => p.filter((id) => lineup.find((c) => c.handle === handle)?.id !== id))}
          blockedReason={blockedReason}
          onFixBlocked={() => {
            setOpen(true);
            setShowErrors(true);
            document.querySelector("details")?.scrollIntoView({ behavior: "smooth", block: "center" });
          }}
          onAddFunds={async () => {
            const r = await topUpAction(1_000_000);
            if (r.ok) {
              toast.push({ title: "Test funds added", body: `${formatEUR(1_000_000)} added. Wallet: ${formatEUR(r.walletCents)}.` });
              router.refresh();
            } else toast.push({ title: "Couldn’t add funds", body: r.error.message, tone: "error" });
          }}
          onCommit={async () => {
            setShowErrors(true);
            const r = await commitLineup({
              brief,
              title,
              destinationUrl: d.url.trim(),
              objective: d.objective,
              keyMessages: d.keyMessages,
              guidelines: d.guidelines,
              publishBy: d.publishBy || null,
              creatorIds: chosen.map((c) => c.id),
            });
            if (!r.ok) {
              toast.push({ title: "Couldn’t place the hold", body: r.error.message, tone: "error" });
              throw new Error(r.error.code);
            }
            toast.push({ title: `${r.count} ${r.count === 1 ? "offer" : "offers"} sent`, body: `${formatEUR(r.totalCents)} is in escrow.` });
            router.push(`/campaigns/${r.campaignId}`);
          }}
        />
      </div>
    </div>
  );
}
