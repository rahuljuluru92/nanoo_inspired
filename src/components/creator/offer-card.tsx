"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { acceptOfferAction, declineOfferAction } from "@/app/(creator)/actions";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/overlay";
import { useToast } from "@/components/ui/toast";
import { formatEUR } from "@/lib/money";
import { formatDay } from "@/lib/time";

export interface OfferView {
  bookingId: string;
  campaignTitle: string;
  brandName: string;
  priceCents: number;
  publishBy: string | null;
  keyMessages: string;
  guidelines: string;
}

/** An offer is one decision. The two buttons sit at the bottom of the card, where a thumb rests. */
export function OfferCard({ offer }: { offer: OfferView }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState<"accept" | "decline" | null>(null);
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");

  async function accept() {
    setBusy("accept");
    const r = await acceptOfferAction(offer.bookingId);
    setBusy(null);
    if (r.ok) {
      toast.push({ title: "Offer accepted", body: "It’s in Deals. Write your draft when you’re ready." });
      router.refresh();
    } else toast.push({ title: "Couldn’t accept", body: r.error.message, tone: "error" });
  }
  async function decline() {
    setBusy("decline");
    const r = await declineOfferAction(offer.bookingId, reason);
    setBusy(null);
    if (r.ok) {
      setDeclining(false);
      toast.push({ title: "Offer declined", body: `${offer.brandName} has been told. Their hold was returned.` });
      router.refresh();
    } else toast.push({ title: "Couldn’t decline", body: r.error.message, tone: "error" });
  }

  return (
    <li className="border border-ink bg-paper-2 p-5">
      <p className="font-mono text-caption text-muted">
        {offer.brandName}
        {offer.publishBy ? ` · publish by ${formatDay(offer.publishBy)}` : ""}
      </p>
      <h2 className="mt-1 text-title">{offer.campaignTitle}</h2>
      <p className="mt-3 font-serif text-display leading-none tabular-nums">{formatEUR(offer.priceCents)}</p>
      <p className="mt-1 text-caption text-muted">Your rate. Held in escrow now; paid when the post is live and approved.</p>
      {offer.keyMessages ? <p className="mt-4 text-small">{offer.keyMessages}</p> : null}
      {offer.guidelines ? (
        <details className="mt-3">
          <summary className="min-h-11 cursor-pointer py-2 text-small underline decoration-line-strong underline-offset-4">Guidelines</summary>
          <p className="pb-2 text-small text-muted">{offer.guidelines}</p>
        </details>
      ) : null}
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Button variant="secondary" disabled={busy !== null} onClick={() => setDeclining(true)}>
          Decline
        </Button>
        <Button variant="primary" pending={busy === "accept"} disabled={busy !== null} onClick={accept}>
          Accept
        </Button>
      </div>

      <Modal open={declining} onOpenChange={setDeclining} title="Decline this offer?" description="The brand’s hold is returned to their wallet straight away.">
        <Field label="Reason (optional)" hint="Shared with the brand.">
          {(p) => <Textarea value={reason} maxLength={300} className="min-h-20" onChange={(e) => setReason(e.target.value)} {...p} />}
        </Field>
        <div className="mt-5 flex justify-end gap-3">
          <Button onClick={() => setDeclining(false)}>Keep it</Button>
          <Button variant="danger" pending={busy === "decline"} onClick={decline}>
            Decline offer
          </Button>
        </div>
      </Modal>
    </li>
  );
}
