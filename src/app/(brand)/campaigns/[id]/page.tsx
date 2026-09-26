import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Halftone } from "@/components/art/halftone";
import { AutoRefresh } from "@/components/ui/auto-refresh";
import { Dateline } from "@/components/ui/dateline";
import { Stamp } from "@/components/ui/stamp";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { requireRole } from "@/lib/auth";
import { asUser } from "@/lib/db";
import { costPerClickCents, formatEUR, formatEUR2 } from "@/lib/money";
import { formatDay } from "@/lib/time";
import type { BookingStatus } from "@/lib/types";
import { tickSandbox } from "@/lib/queries/tick";

export const metadata: Metadata = { title: "Campaign" };

interface Camp {
  id: string;
  title: string;
  status: string;
  objective: string;
  destination_url: string;
  key_messages: string;
  budget_cents: number;
  publish_by: Date | null;
  created_at: Date;
}
interface Bk {
  id: string;
  status: BookingStatus;
  price_cents: number;
  handle: string;
  display_name: string;
  is_sandbox: boolean;
  uniq: string;
  impressions: number | null;
}

const IN_FLIGHT: BookingStatus[] = ["invited", "accepted", "drafted", "changes_requested", "approved", "live"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const s = await requireRole("brand", `/campaigns/${id}`);
  await tickSandbox(s.accountId);
  const data = await asUser(s.accountId, async (c) => {
    const camp = await c.query<Camp>("select id, title, status, objective, destination_url, key_messages, budget_cents, publish_by, created_at from campaigns where id = $1", [id]);
    if (!camp.rows[0]) return null;
    const bks = await c.query<Bk>(
      `select b.id, b.status, b.price_cents, cr.handle, cr.display_name, cr.is_sandbox,
              coalesce(m.clicks_unique, 0) as uniq, ps.impressions
         from bookings b
         join public_creators cr on cr.id = b.creator_id
         left join booking_metrics m on m.booking_id = b.id
         left join post_stats ps on ps.booking_id = b.id
        where b.campaign_id = $1 order by b.invited_at, cr.display_name`,
      [id],
    );
    return { camp: camp.rows[0], bookings: bks.rows };
  });
  if (!data) notFound();
  const { camp, bookings } = data;

  const committed = bookings.filter((b) => b.status !== "declined" && b.status !== "cancelled").reduce((a, b) => a + b.price_cents, 0);
  const inEscrow = bookings.filter((b) => IN_FLIGHT.includes(b.status)).reduce((a, b) => a + b.price_cents, 0);
  const paid = bookings.filter((b) => b.status === "paid").reduce((a, b) => a + b.price_cents, 0);
  const clicks = bookings.reduce((a, b) => a + Number(b.uniq), 0);
  const cpc = costPerClickCents(bookings.filter((b) => b.status === "live" || b.status === "paid").reduce((a, b) => a + b.price_cents, 0), clicks);
  // sandbox creators are still on their way: keep this page fresh so offers visibly resolve
  const moving = bookings.some((b) => b.is_sandbox && ["invited", "accepted", "changes_requested", "approved"].includes(b.status));

  return (
    <div>
      <AutoRefresh active={moving} everyMs={5000} />
      <Link href="/campaigns" className="inline-flex min-h-11 items-center text-small text-muted underline decoration-line-strong underline-offset-4 hover:text-ink">
        ← All campaigns
      </Link>
      <Dateline className="mt-2">
        Campaign · {camp.status} · created {formatDay(camp.created_at.toISOString())}
      </Dateline>
      <h1 className="mt-1 text-display">{camp.title}</h1>
      <p className="mt-2 max-w-prose break-all text-small text-muted">
        {camp.key_messages ? `${camp.key_messages} · ` : ""}
        {camp.destination_url}
      </p>

      <dl className="mt-8 grid max-w-4xl grid-cols-2 gap-x-8 gap-y-5 border-y border-line py-5 sm:grid-cols-5">
        {[
          ["Committed", formatEUR(committed)],
          ["In escrow", formatEUR(inEscrow)],
          ["Paid out", formatEUR(paid)],
          ["Unique clicks", clicks.toLocaleString("en-IE")],
          ["Cost per click", cpc === null ? "—" : formatEUR2(cpc)],
        ].map(([k, v]) => (
          <div key={k}>
            <dt className="font-mono text-caption text-muted">{k}</dt>
            <dd className="font-serif text-title tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>

      <h2 className="mt-10 text-title">Bookings</h2>
      {moving ? <p className="mt-1 text-small text-muted">Sandbox creators reply automatically. This page updates as they do.</p> : null}
      <div className="mt-4 max-w-4xl">
        <Table caption="Bookings in this campaign">
          <THead>
            <TR>
              <TH>Creator</TH>
              <TH>Status</TH>
              <TH num>Price</TH>
              <TH num>Unique clicks</TH>
              <TH num>Impressions</TH>
            </TR>
          </THead>
          <TBody>
            {bookings.map((b) => (
              <TR key={b.id}>
                <TD>
                  <span className="flex items-center gap-3">
                    <Halftone seed={b.handle} size={36} />
                    <span>
                      <span className="block font-serif text-[1.1rem] leading-tight">{b.display_name}</span>
                      {b.is_sandbox ? <span className="font-mono text-caption text-muted">Sandbox creator · replies automatically</span> : null}
                    </span>
                  </span>
                </TD>
                <TD>
                  <Stamp status={b.status} />
                </TD>
                <TD num>{formatEUR(b.price_cents)}</TD>
                <TD num>{b.status === "live" || b.status === "paid" ? Number(b.uniq).toLocaleString("en-IE") : "—"}</TD>
                <TD num>{b.impressions === null ? "—" : b.impressions.toLocaleString("en-IE")}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </div>
    </div>
  );
}
