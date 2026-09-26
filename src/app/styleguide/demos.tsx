"use client";

import { useMemo, useState } from "react";
import { BriefSentence } from "@/components/desk/brief-sentence";
import { HoldButton } from "@/components/desk/hold-button";
import { RosterRow } from "@/components/desk/roster-row";
import { Tray } from "@/components/desk/tray";
import { Button } from "@/components/ui/button";
import { CountUp } from "@/components/ui/count-up";
import { Dateline } from "@/components/ui/dateline";
import { Modal, Sheet } from "@/components/ui/overlay";
import { Popover } from "@/components/ui/popover";
import { useToast } from "@/components/ui/toast";
import { formatEUR } from "@/lib/money";
import type { BriefValue } from "@/lib/types";
import { INITIAL_BRIEF, OPTIONS, demoScore } from "./fixtures";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** The flagship: sentence → live lineup → tray → hold to commit. Demo data and a demo scorer; real logic lands in Phase 4. */
export function DeskDemo() {
  const toast = useToast();
  const [brief, setBrief] = useState<BriefValue>(INITIAL_BRIEF);
  const [picked, setPicked] = useState<string[]>(["maya-okafor", "jonas-brandt", "lea-marchetti"]);
  const [wallet, setWallet] = useState(1200000);
  const [failNext, setFailNext] = useState(false);
  const lineup = useMemo(() => demoScore(brief), [brief]);
  const items = lineup.filter((c) => picked.includes(c.handle));
  const total = items.reduce((a, c) => a + c.rateCents, 0);
  const remaining = Math.max(0, brief.budgetCents - total);

  return (
    <div>
      <Dateline>Brief № 0042 · filed 26 Sep</Dateline>
      <div className="mt-2">
        <BriefSentence value={brief} onChange={setBrief} options={OPTIONS} />
      </div>
      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22.5rem]">
        <section aria-label="Lineup">
          <div className="flex items-baseline justify-between border-b border-ink pb-2 font-mono text-caption text-muted">
            <span>Lineup · sorted by fit</span>
            <span className="hidden sm:inline">fit · €/post · est. clicks</span>
          </div>
          <ul>
            {lineup.map((c) => (
              <RosterRow
                key={c.handle}
                creator={c}
                selected={picked.includes(c.handle)}
                overBudgetCents={!picked.includes(c.handle) && brief.budgetCents > 0 && c.rateCents > remaining ? c.rateCents - remaining : 0}
                onToggle={() => setPicked((p) => (p.includes(c.handle) ? p.filter((h) => h !== c.handle) : [...p, c.handle]))}
              />
            ))}
          </ul>
        </section>
        <Tray
          items={items.map((c) => ({ handle: c.handle, name: c.name, priceCents: c.rateCents, projection: c.projection }))}
          budgetCents={brief.budgetCents}
          walletCents={wallet}
          onRemove={(h) => setPicked((p) => p.filter((x) => x !== h))}
          onAddFunds={() => {
            setWallet((w) => w + 1000000);
            toast.push({ title: "Test funds added", body: "€10,000 added to your wallet (test mode)." });
          }}
          onCommit={async () => {
            await wait(700);
            if (failNext) {
              setFailNext(false);
              toast.push({ title: "Couldn’t place the hold", body: "Nothing moved. Your wallet and lineup are unchanged.", tone: "error" });
              throw new Error("demo failure");
            }
            setWallet((w) => w - total);
            toast.push({ title: `${items.length} offers sent`, body: `${formatEUR(total)} is in escrow.` });
            setPicked([]);
          }}
        />
      </div>
      <label className="mt-6 inline-flex min-h-11 items-center gap-2 text-small text-muted">
        <input type="checkbox" checked={failNext} onChange={(e) => setFailNext(e.target.checked)} className="size-4 accent-[var(--ink)]" />
        Make the next hold fail (to see the error state)
      </label>
    </div>
  );
}

export function HoldDemo() {
  const [fail, setFail] = useState(false);
  return (
    <div className="max-w-sm">
      <HoldButton
        summary={<p>Demo only: nothing is charged.</p>}
        onCommit={async () => {
          await wait(600);
          if (fail) throw new Error("demo");
        }}
      />
      <label className="mt-4 inline-flex min-h-11 items-center gap-2 text-small text-muted">
        <input type="checkbox" checked={fail} onChange={(e) => setFail(e.target.checked)} className="size-4 accent-[var(--ink)]" />
        Fail on commit
      </label>
    </div>
  );
}

export function OverlayDemo() {
  const toast = useToast();
  const [modal, setModal] = useState(false);
  const [right, setRight] = useState(false);
  const [bottom, setBottom] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button onClick={() => setModal(true)}>Open dialog</Button>
      <Button onClick={() => setRight(true)}>Open drawer</Button>
      <Button onClick={() => setBottom(true)}>Open bottom sheet</Button>
      <Popover label="Example popover" trigger={<Button variant="ghost">Open popover</Button>}>
        <p className="text-small">Popovers hold slot pickers on the Desk. Esc closes; focus returns to the trigger.</p>
      </Popover>
      <Button onClick={() => toast.push({ title: "Draft saved", body: "Autosaved a moment ago." })}>Toast</Button>
      <Button variant="danger" onClick={() => toast.push({ title: "Couldn’t save the draft", body: "Check your connection and try again.", tone: "error" })}>
        Error toast
      </Button>
      <Modal open={modal} onOpenChange={setModal} title="Cancel this offer?" description="The escrowed amount returns to your wallet straight away.">
        <div className="flex justify-end gap-3">
          <Button onClick={() => setModal(false)}>Keep it</Button>
          <Button variant="danger" onClick={() => setModal(false)}>
            Cancel offer
          </Button>
        </div>
      </Modal>
      <Sheet open={right} onOpenChange={setRight} title="Booking · Maya Okafor" side="right">
        <p className="text-small text-muted">The booking drawer shows the event timeline, the draft for review, and the actions for the current state.</p>
      </Sheet>
      <Sheet open={bottom} onOpenChange={setBottom} title="Your tray" side="bottom">
        <p className="text-small text-muted">On phones the tray lives here, behind a peek bar that always shows count, total and projected clicks.</p>
      </Sheet>
    </div>
  );
}

export function CountDemo() {
  const [n, setN] = useState(1810);
  return (
    <div className="flex flex-wrap items-baseline gap-6">
      <p className="font-serif text-display tabular-nums">
        <CountUp value={n} format={(x) => Math.round(x).toLocaleString("en-IE")} /> <span className="font-sans text-small text-muted">clicks</span>
      </p>
      <Button size="sm" onClick={() => setN((x) => x + 1 + Math.floor(Math.random() * 400))}>
        Add clicks
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setN(1810)}>
        Reset
      </Button>
    </div>
  );
}
