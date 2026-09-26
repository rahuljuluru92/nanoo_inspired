"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { markLiveAction, reportStatsAction, saveDraftAction, submitDraftAction } from "@/app/(creator)/actions";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { formatEUR } from "@/lib/money";
import type { BookingStatus } from "@/lib/types";
import { CopyField } from "./copy-field";

export interface DealPanelProps {
  bookingId: string;
  status: BookingStatus;
  brandName: string;
  priceCents: number;
  draftText: string;
  changesNote: string | null;
  postUrl: string | null;
  trackingCode: string;
  clicksUnique: number;
  clicksTotal: number;
  stats: { impressions: number; reactions: number; comments: number; source: string } | null;
}

type Save = "idle" | "dirty" | "saving" | "saved" | "error";
const MIN = 20;

/** The one thing to do next on this deal, and nothing else. */
export function DealPanel(p: DealPanelProps) {
  if (p.status === "accepted" || p.status === "changes_requested") return <Editor {...p} />;
  if (p.status === "drafted")
    return (
      <Box title="Waiting for the brand" tone="calm">
        <p className="text-small">{p.brandName} is reviewing your draft. You’ll be notified as soon as they approve it or ask for changes.</p>
        <pre className="mt-4 whitespace-pre-wrap border-l-2 border-ink pl-4 font-sans text-small">{p.draftText}</pre>
      </Box>
    );
  if (p.status === "approved") return <GoLive {...p} />;
  if (p.status === "live") return <Live {...p} />;
  if (p.status === "paid")
    return (
      <Box title="Paid" tone="calm">
        <p className="text-small">
          {formatEUR(p.priceCents)} is in your balance. This post now has a public Receipt, with clicks counted by the tracked link.
        </p>
        <a href={`/receipt/${p.trackingCode}`} className="mt-3 inline-flex min-h-11 items-center underline decoration-line-strong underline-offset-4 hover:decoration-ink">
          View the Receipt
        </a>
      </Box>
    );
  return (
    <Box title={p.status === "declined" ? "You declined this offer" : "This offer was cancelled"} tone="calm">
      <p className="text-small text-muted">Nothing more to do here.</p>
    </Box>
  );
}

function Box({ title, tone, children }: { title: string; tone?: "calm" | "act"; children: React.ReactNode }) {
  return (
    <section className={tone === "act" ? "border border-ink bg-paper-2 p-5" : "border border-line-strong p-5"} aria-label={title}>
      <h2 className="text-title">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Editor(p: DealPanelProps) {
  const router = useRouter();
  const toast = useToast();
  const [text, setText] = useState(p.draftText);
  const [save, setSave] = useState<Save>("idle");
  const [at, setAt] = useState("");
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function flush(v: string) {
    setSave("saving");
    const r = await saveDraftAction(p.bookingId, v);
    setSave(r.ok ? "saved" : "error");
    if (r.ok) setAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
  }
  function onChange(v: string) {
    setText(v);
    setSave("dirty");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(v), 1200); // autosave shortly after you stop typing
  }
  async function submit() {
    if (timer.current) clearTimeout(timer.current);
    setBusy(true);
    const r = await submitDraftAction(p.bookingId, text);
    setBusy(false);
    if (r.ok) {
      toast.push({ title: "Draft submitted", body: `${p.brandName} will review it.` });
      router.refresh();
    } else toast.push({ title: "Couldn’t submit", body: r.error.message, tone: "error" });
  }

  const status =
    save === "saving" ? "Saving…" : save === "saved" ? `Saved ${at}` : save === "error" ? "Couldn’t save. Your text is still here; keep typing to retry." : save === "dirty" ? "Unsaved changes" : text ? "Draft loaded" : "";
  const ready = text.trim().length >= MIN;

  return (
    <Box title={p.status === "changes_requested" ? "Revise your draft" : "Write your draft"} tone="act">
      {p.changesNote ? (
        <div className="mb-4 border border-vermilion-ink p-3 text-small">
          <p className="font-medium">{p.brandName} asked for changes</p>
          <p className="mt-1">{p.changesNote}</p>
        </div>
      ) : null}
      <Field label="Your post" hint="Write it as you’d publish it, with one clear next step. Your tracked link is added when you go live.">
        {(f) => <Textarea value={text} maxLength={5000} className="min-h-64 text-body" onChange={(e) => onChange(e.target.value)} {...f} />}
      </Field>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 font-mono text-caption text-muted">
        <span role="status" aria-live="polite" className={save === "error" ? "text-vermilion-ink" : undefined}>
          {status}
        </span>
        <span className="tabular-nums">{text.length.toLocaleString("en-IE")}/5,000</span>
      </div>
      <div className="mt-4">
        <Button variant="primary" className="w-full sm:w-auto" pending={busy} disabled={!ready} onClick={submit}>
          Submit draft
        </Button>
        {!ready ? <p className="mt-1.5 text-caption text-muted">A draft needs at least {MIN} characters.</p> : null}
      </div>
    </Box>
  );
}

function GoLive(p: DealPanelProps) {
  const router = useRouter();
  const toast = useToast();
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function go() {
    setErr("");
    if (!/^https?:\/\/\S+\.\S+$/i.test(url.trim())) return setErr("Enter the full link to your published post, starting with https://");
    setBusy(true);
    const r = await markLiveAction(p.bookingId, url);
    setBusy(false);
    if (r.ok) {
      toast.push({ title: "You’re live", body: "Add your tracked link below so clicks are counted." });
      router.refresh();
    } else setErr(r.error.message);
  }
  return (
    <Box title="Approved. Post it." tone="act">
      <ol className="grid gap-2 text-small">
        <li>1. Publish your approved draft on LinkedIn.</li>
        <li>2. Paste the link to the live post here.</li>
        <li>3. You’ll get a tracked link to put in the first comment.</li>
      </ol>
      <div className="mt-5">
        <Field label="Link to your live post" error={err || undefined}>
          {(f) => <Input type="url" inputMode="url" value={url} placeholder="https://www.linkedin.com/posts/…" onChange={(e) => setUrl(e.target.value)} {...f} />}
        </Field>
      </div>
      <Button variant="primary" className="mt-4 w-full sm:w-auto" pending={busy} onClick={go}>
        Mark as live
      </Button>
    </Box>
  );
}

function Live(p: DealPanelProps) {
  const router = useRouter();
  const toast = useToast();
  const [imp, setImp] = useState(p.stats ? String(p.stats.impressions) : "");
  const [rea, setRea] = useState(p.stats ? String(p.stats.reactions) : "");
  const [com, setCom] = useState(p.stats ? String(p.stats.comments) : "");
  const [busy, setBusy] = useState(false);
  async function report() {
    setBusy(true);
    const r = await reportStatsAction(p.bookingId, Number(imp), Number(rea), Number(com));
    setBusy(false);
    if (r.ok) {
      toast.push({ title: "Stats saved", body: "They show on your Receipt as creator-reported." });
      router.refresh();
    } else toast.push({ title: "Couldn’t save stats", body: r.error.message, tone: "error" });
  }
  const num = (v: string) => v.replace(/[^\d]/g, "").slice(0, 9);
  return (
    <div className="grid gap-5">
      <Box title="You’re live" tone="act">
        <p className="text-small">{p.brandName} will release your {formatEUR(p.priceCents)} after checking the post. Put the tracked link in your first comment so every click is counted.</p>
        <div className="mt-4">
          <CopyField path={`/go/${p.trackingCode}`} label="Your tracked link" />
        </div>
        {p.postUrl ? (
          <p className="mt-3 break-all text-caption text-muted">
            Post: {p.postUrl}
          </p>
        ) : null}
        <dl className="mt-5 grid grid-cols-2 gap-6 border-t border-line pt-4">
          <div>
            <dt className="font-mono text-caption text-muted">Unique clicks</dt>
            <dd className="font-serif text-display tabular-nums">{p.clicksUnique.toLocaleString("en-IE")}</dd>
          </div>
          <div>
            <dt className="font-mono text-caption text-muted">Total clicks</dt>
            <dd className="font-serif text-display tabular-nums">{p.clicksTotal.toLocaleString("en-IE")}</dd>
          </div>
        </dl>
      </Box>
      <Box title="Report your stats" tone="calm">
        <p className="text-small text-muted">Optional. Impressions come from LinkedIn analytics. They show on the Receipt as creator-reported.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Field label="Impressions">{(f) => <Input inputMode="numeric" value={imp} onChange={(e) => setImp(num(e.target.value))} {...f} />}</Field>
          <Field label="Reactions">{(f) => <Input inputMode="numeric" value={rea} onChange={(e) => setRea(num(e.target.value))} {...f} />}</Field>
          <Field label="Comments">{(f) => <Input inputMode="numeric" value={com} onChange={(e) => setCom(num(e.target.value))} {...f} />}</Field>
        </div>
        <Button className="mt-4" pending={busy} disabled={imp === ""} onClick={report}>
          Save stats
        </Button>
      </Box>
    </div>
  );
}
