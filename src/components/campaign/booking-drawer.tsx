"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { approveDraftAction, cancelBookingAction, releasePayoutAction, requestChangesAction, setReceiptPublicAction } from "@/app/(brand)/campaigns/actions";
import { CopyField } from "@/components/creator/copy-field";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { LocalTime } from "@/components/ui/local-time";
import { Modal, Sheet } from "@/components/ui/overlay";
import { Stamp } from "@/components/ui/stamp";
import { useToast } from "@/components/ui/toast";
import { costPerClickCents, formatEUR, formatEUR2 } from "@/lib/money";
import { brandEventLabel } from "@/lib/timeline";
import type { BookingStatus } from "@/lib/types";

export interface BookingView {
  id: string;
  status: BookingStatus;
  priceCents: number;
  handle: string;
  name: string;
  isSandbox: boolean;
  trackingCode: string;
  postUrl: string | null;
  draftText: string;
  draftVersion: number;
  receiptPublic: boolean;
  invitedAt: string;
  dueAt: string | null;
  clicksUnique: number;
  clicksTotal: number;
  impressions: number | null;
  events: { id: string; kind: string; note: string | null; meta: Record<string, unknown>; at: string }[];
  clicksByDay: number[];
}

type Confirm = null | "release" | "cancel";

/** Everything the brand can do with one booking, in the order things happen. */
export function BookingDrawer({ booking, onClose }: { booking: BookingView | null; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [note, setNote] = useState("");
  const [confirm, setConfirm] = useState<Confirm>(null);

  if (!booking) return <Sheet open={false} onOpenChange={() => {}} title="Booking" side="right">{null}</Sheet>;
  const b = booking;

  async function act(key: string, fn: () => Promise<{ ok: true } | { ok: false; error: { message: string } }>, done: { title: string; body?: string }) {
    setBusy(key);
    const r = await fn();
    setBusy(null);
    if (r.ok) {
      toast.push(done);
      setAsking(false);
      setNote("");
      setConfirm(null);
      router.refresh();
    } else toast.push({ title: "That didn’t go through", body: r.error.message, tone: "error" });
  }

  const cpc = costPerClickCents(b.priceCents, b.clicksUnique);
  const cancellable = ["invited", "accepted", "drafted", "changes_requested", "approved"].includes(b.status);

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()} title={b.name} side="right">
      <div className="flex items-center gap-3">
        <Stamp status={b.status} />
        <span className="font-mono text-small tabular-nums">{formatEUR(b.priceCents)}</span>
        {b.isSandbox ? <span className="font-mono text-caption text-muted">Sandbox · replies automatically</span> : null}
      </div>

      <div className="mt-6 grid gap-6">
        {b.status === "invited" ? <p className="text-small">Offer sent. {b.name} hasn’t answered yet. The {formatEUR(b.priceCents)} is held in escrow until they do.</p> : null}
        {b.status === "accepted" ? <p className="text-small">{b.name} accepted and is writing the draft.</p> : null}
        {b.status === "changes_requested" ? <p className="text-small">You asked for changes. {b.name} is revising the draft.</p> : null}
        {b.status === "approved" ? <p className="text-small">Draft approved. Waiting for {b.name} to publish and add the link.</p> : null}
        {b.status === "declined" ? <p className="text-small">{b.name} declined. The hold went back to your wallet.</p> : null}
        {b.status === "cancelled" ? <p className="text-small">You cancelled this offer. The hold went back to your wallet.</p> : null}

        {b.status === "drafted" ? (
          <section aria-label="Draft to review" className="border border-ink bg-paper-2 p-4">
            <h3 className="font-serif text-title">Review the draft</h3>
            <p className="font-mono text-caption text-muted">Version {b.draftVersion}</p>
            <pre className="mt-3 whitespace-pre-wrap border-l-2 border-ink pl-4 font-sans text-small">{b.draftText}</pre>
            {asking ? (
              <div className="mt-4">
                <Field label="What should change?" hint="Be specific; they’ll see this note.">
                  {(f) => <Textarea value={note} maxLength={500} className="min-h-24" onChange={(e) => setNote(e.target.value)} {...f} />}
                </Field>
                <div className="mt-3 flex flex-wrap gap-3">
                  <Button variant="primary" pending={busy === "changes"} disabled={note.trim().length < 5} onClick={() => act("changes", () => requestChangesAction(b.id, note), { title: "Changes requested", body: `${b.name} has been notified.` })}>
                    Send request
                  </Button>
                  <Button onClick={() => setAsking(false)}>Back</Button>
                </div>
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Button onClick={() => setAsking(true)}>Request changes</Button>
                <Button variant="primary" pending={busy === "approve"} onClick={() => act("approve", () => approveDraftAction(b.id), { title: "Draft approved", body: `${b.name} can now publish.` })}>
                  Approve
                </Button>
              </div>
            )}
          </section>
        ) : null}

        {b.status === "live" || b.status === "paid" ? (
          <section aria-label="Results" className={b.status === "live" ? "border border-ink bg-paper-2 p-4" : "border border-line-strong p-4"}>
            <h3 className="font-serif text-title">{b.status === "live" ? "Live now" : "Paid"}</h3>
            {b.postUrl ? (
              <p className="break-all text-caption">
                <a href={b.postUrl} className="inline-block py-3.5 underline decoration-line-strong underline-offset-4 hover:decoration-ink" target="_blank" rel="noreferrer">
                  {b.postUrl}
                </a>
              </p>
            ) : null}
            <dl className="mt-4 grid grid-cols-3 gap-4">
              <div>
                <dt className="font-mono text-caption text-muted">Unique</dt>
                <dd className="font-serif text-title tabular-nums">{b.clicksUnique.toLocaleString("en-IE")}</dd>
              </div>
              <div>
                <dt className="font-mono text-caption text-muted">Total</dt>
                <dd className="font-serif text-title tabular-nums">{b.clicksTotal.toLocaleString("en-IE")}</dd>
              </div>
              <div>
                <dt className="font-mono text-caption text-muted">Per click</dt>
                <dd className="font-serif text-title tabular-nums text-green">{cpc === null ? "—" : formatEUR2(cpc)}</dd>
              </div>
            </dl>
            <p className="mt-2 text-caption text-muted">
              Impressions: {b.impressions === null ? "not reported yet" : b.impressions.toLocaleString("en-IE")} (self-reported). Clicks are counted by Byline.
            </p>
            <div className="mt-4">
              <CopyField path={`/go/${b.trackingCode}`} label="Tracked link" />
            </div>
            {b.status === "live" ? (
              <div className="mt-5">
                <Button variant="primary" className="w-full" onClick={() => setConfirm("release")}>
                  Release {formatEUR(b.priceCents)} to {b.name.split(" ")[0]}
                </Button>
                <p className="mt-1.5 text-caption text-muted">Check the post first. Releasing moves the escrow to the creator and can’t be undone.</p>
              </div>
            ) : null}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
              <a href={`/receipt/${b.trackingCode}`} className="inline-flex min-h-11 items-center text-small underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                Open the Receipt
              </a>
              <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-small">
                <input
                  type="checkbox"
                  checked={b.receiptPublic}
                  disabled={busy === "receipt"}
                  onChange={(e) => act("receipt", () => setReceiptPublicAction(b.id, e.target.checked), { title: e.target.checked ? "Receipt is public" : "Receipt link revoked", body: e.target.checked ? "Anyone with the link can see it." : "The link no longer works." })}
                  className="size-4 accent-[var(--ink)]"
                />
                Public link
              </label>
            </div>
          </section>
        ) : null}

        {cancellable && !asking ? (
          <div>
            <Button variant="danger" size="sm" onClick={() => setConfirm("cancel")}>
              Cancel offer
            </Button>
          </div>
        ) : null}

        <section aria-labelledby="hist">
          <h3 id="hist" className="font-serif text-title">
            History
          </h3>
          <ol className="mt-2 border-b border-line">
            {[...b.events].reverse().map((e) => (
              <li key={e.id} className="grid grid-cols-[3.25rem_1fr] gap-3 border-t border-line py-2.5 text-small">
                <span className="font-mono text-caption text-muted">
                  <LocalTime iso={e.at} mode="clock" />
                </span>
                <span>{brandEventLabel(e.kind, b.name, e.note, e.meta)}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <Modal open={confirm === "release"} onOpenChange={(o) => !o && setConfirm(null)} title={`Release ${formatEUR(b.priceCents)}?`} description={`This pays ${b.name} from escrow and completes the deal. It can’t be undone.`}>
        <div className="flex justify-end gap-3">
          <Button onClick={() => setConfirm(null)}>Not yet</Button>
          <Button variant="primary" pending={busy === "release"} onClick={() => act("release", () => releasePayoutAction(b.id), { title: "Payout released", body: `${formatEUR(b.priceCents)} went to ${b.name}. The Receipt is final.` })}>
            Release payout
          </Button>
        </div>
      </Modal>
      <Modal open={confirm === "cancel"} onOpenChange={(o) => !o && setConfirm(null)} title="Cancel this offer?" description={`The ${formatEUR(b.priceCents)} hold returns to your wallet straight away, and ${b.name} is told.`}>
        <div className="flex justify-end gap-3">
          <Button onClick={() => setConfirm(null)}>Keep it</Button>
          <Button variant="danger" pending={busy === "cancel"} onClick={() => act("cancel", () => cancelBookingAction(b.id), { title: "Offer cancelled", body: "The hold is back in your wallet." })}>
            Cancel offer
          </Button>
        </div>
      </Modal>
    </Sheet>
  );
}
