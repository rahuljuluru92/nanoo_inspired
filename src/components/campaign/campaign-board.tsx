"use client";

import { useState } from "react";
import { Halftone } from "@/components/art/halftone";
import { RunOfShow, type ShowItem } from "@/components/receipt/run-of-show";
import { Button } from "@/components/ui/button";
import { Stamp } from "@/components/ui/stamp";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { formatEUR } from "@/lib/money";
import type { BookingStatus } from "@/lib/types";
import { BookingDrawer, type BookingView } from "./booking-drawer";

const DAY = 86_400_000;
const NEEDS_YOU: BookingStatus[] = ["drafted"];

/** The campaign at a glance: a timeline of every booking, then a list where each row opens its drawer. */
export function CampaignBoard({ bookings, today }: { bookings: BookingView[]; today: string }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = bookings.find((b) => b.id === selectedId) ?? null;

  const t = new Date(today).getTime();
  const items: ShowItem[] = bookings.map((b) => {
    const start = new Date(b.invitedAt).getTime();
    const due = b.dueAt ? new Date(b.dueAt).getTime() : start + 14 * DAY;
    return {
      id: b.id,
      name: b.name,
      status: b.status,
      start: new Date(start).toISOString(),
      end: new Date(Math.max(due, start + 2 * DAY)).toISOString(),
      clicks: b.status === "live" || b.status === "paid" ? b.clicksUnique : undefined,
      clicksByDay: b.clicksByDay,
    };
  });
  const starts = items.map((i) => new Date(i.start).getTime());
  const ends = items.map((i) => new Date(i.end).getTime());
  const rangeStart = new Date(Math.min(...starts, t) - DAY).toISOString();
  const rangeEnd = new Date(Math.max(...ends, t + 3 * DAY) + DAY).toISOString();

  return (
    <div>
      <h2 className="mt-10 text-title">Run of show</h2>
      <p className="mt-1 text-small text-muted">Each block runs from the offer to the publish-by date. Live posts carry their unique clicks.</p>
      <div className="mt-4 max-w-5xl">
        <RunOfShow items={items} rangeStart={rangeStart} rangeEnd={rangeEnd} today={today} />
      </div>

      <h2 className="mt-12 text-title">Bookings</h2>
      <div className="mt-4 max-w-5xl">
        <Table caption="Bookings in this campaign">
          <THead>
            <TR>
              <TH>Creator</TH>
              <TH>Status</TH>
              <TH num>Price</TH>
              <TH num>Unique clicks</TH>
              <TH>
                <span className="sr-only">Action</span>
              </TH>
            </TR>
          </THead>
          <TBody>
            {bookings.map((b) => (
              <TR key={b.id}>
                <TD>
                  <span className="flex items-center gap-3">
                    <Halftone seed={b.handle} size={36} />
                    <span>
                      <span className="block font-serif text-[1.1rem] leading-tight">{b.name}</span>
                      {b.isSandbox ? <span className="font-mono text-caption text-muted">Sandbox creator · replies automatically</span> : null}
                    </span>
                  </span>
                </TD>
                <TD>
                  <Stamp status={b.status} />
                </TD>
                <TD num>{formatEUR(b.priceCents)}</TD>
                <TD num>{b.status === "live" || b.status === "paid" ? b.clicksUnique.toLocaleString("en-IE") : "—"}</TD>
                <TD className="text-right">
                  <Button size="sm" variant={NEEDS_YOU.includes(b.status) || b.status === "live" ? "primary" : "secondary"} onClick={() => setSelectedId(b.id)} aria-label={`Open ${b.name}`}>
                    {b.status === "drafted" ? "Review draft" : b.status === "live" ? "Results" : "Open"}
                  </Button>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </div>
      <BookingDrawer booking={selected} onClose={() => setSelectedId(null)} />
    </div>
  );
}
