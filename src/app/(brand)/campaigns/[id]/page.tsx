import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { BookingView } from "@/components/campaign/booking-drawer";
import { CampaignBoard } from "@/components/campaign/campaign-board";
import { Metric } from "@/components/campaign/metric";
import { AutoRefresh } from "@/components/ui/auto-refresh";
import { Dateline } from "@/components/ui/dateline";
import { requireRole } from "@/lib/auth";
import { asUser } from "@/lib/db";
import { costPerClickCents } from "@/lib/money";
import { tickSandbox } from "@/lib/queries/tick";
import { formatDay } from "@/lib/time";
import type { BookingStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Campaign" };

interface Camp {
  id: string;
  title: string;
  status: string;
  destination_url: string;
  key_messages: string;
  created_at: Date;
}
interface Bk {
  id: string;
  status: BookingStatus;
  price_cents: number;
  tracking_code: string;
  post_url: string | null;
  draft_text: string | null;
  draft_version: number;
  receipt_public: boolean;
  invited_at: Date;
  due_at: Date | null;
  handle: string;
  display_name: string;
  is_sandbox: boolean;
  uniq: string;
  total: string;
  impressions: number | null;
}
interface Ev {
  booking_id: string;
  id: string;
  kind: string;
  note: string | null;
  meta: Record<string, unknown>;
  at: Date;
}
interface Day {
  booking_id: string;
  d: string;
  n: string;
}

const IN_FLIGHT: BookingStatus[] = ["invited", "accepted", "drafted", "changes_requested", "approved", "live"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Daily click counts as a gap-free series (zeros for quiet days), so a sparkline shows the real shape. */
function series(days: Day[]): number[] {
  if (days.length === 0) return [];
  const map = new Map(days.map((d) => [d.d, Number(d.n)]));
  const first = new Date(days[0]!.d + "T00:00:00Z").getTime();
  const last = new Date(days[days.length - 1]!.d + "T00:00:00Z").getTime();
  const out: number[] = [];
  for (let t = first; t <= last && out.length < 60; t += 86_400_000) out.push(map.get(new Date(t).toISOString().slice(0, 10)) ?? 0);
  return out;
}

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const s = await requireRole("brand", `/campaigns/${id}`);
  await tickSandbox(s.accountId);
  const data = await asUser(s.accountId, async (c) => {
    const camp = await c.query<Camp>("select id, title, status, destination_url, key_messages, created_at from campaigns where id = $1", [id]);
    if (!camp.rows[0]) return null;
    const bks = await c.query<Bk>(
      `select b.id, b.status, b.price_cents, b.tracking_code, b.post_url, b.draft_text, b.draft_version, b.receipt_public, b.invited_at, b.due_at,
              cr.handle, cr.display_name, cr.is_sandbox,
              coalesce(m.clicks_unique, 0) as uniq, coalesce(m.clicks_total, 0) as total, ps.impressions
         from bookings b
         join public_creators cr on cr.id = b.creator_id
         left join booking_metrics m on m.booking_id = b.id
         left join post_stats ps on ps.booking_id = b.id
        where b.campaign_id = $1 order by b.invited_at, cr.display_name`,
      [id],
    );
    const evs = await c.query<Ev>(
      `select e.booking_id, e.id::text, e.kind, e.note, e.meta, e.at
         from booking_events e join bookings b on b.id = e.booking_id where b.campaign_id = $1 order by e.at, e.id`,
      [id],
    );
    const days = await c.query<Day>(
      `select t.booking_id, to_char(date_trunc('day', t.at at time zone 'UTC'), 'YYYY-MM-DD') as d, count(*) as n
         from tracking_events t join bookings b on b.id = t.booking_id
        where b.campaign_id = $1 and t.kind = 'click' and t.ua_class = 'human' group by 1, 2 order by 2`,
      [id],
    );
    return { camp: camp.rows[0], bks: bks.rows, evs: evs.rows, days: days.rows };
  });
  if (!data) notFound();
  const { camp, bks, evs, days } = data;

  const views: BookingView[] = bks.map((b) => ({
    id: b.id,
    status: b.status,
    priceCents: b.price_cents,
    handle: b.handle,
    name: b.display_name,
    isSandbox: b.is_sandbox,
    trackingCode: b.tracking_code,
    postUrl: b.post_url,
    draftText: b.draft_text ?? "",
    draftVersion: b.draft_version,
    receiptPublic: b.receipt_public,
    invitedAt: b.invited_at.toISOString(),
    dueAt: b.due_at ? b.due_at.toISOString() : null,
    clicksUnique: Number(b.uniq),
    clicksTotal: Number(b.total),
    impressions: b.impressions,
    events: evs.filter((e) => e.booking_id === b.id).map((e) => ({ id: e.id, kind: e.kind, note: e.note, meta: e.meta, at: e.at.toISOString() })),
    clicksByDay: series(days.filter((d) => d.booking_id === b.id)),
  }));

  const committed = bks.filter((b) => b.status !== "declined" && b.status !== "cancelled").reduce((a, b) => a + b.price_cents, 0);
  const inEscrow = bks.filter((b) => IN_FLIGHT.includes(b.status)).reduce((a, b) => a + b.price_cents, 0);
  const paid = bks.filter((b) => b.status === "paid").reduce((a, b) => a + b.price_cents, 0);
  const clicks = bks.reduce((a, b) => a + Number(b.uniq), 0);
  const cpc = costPerClickCents(bks.filter((b) => b.status === "live" || b.status === "paid").reduce((a, b) => a + b.price_cents, 0), clicks);
  const drafts = bks.filter((b) => b.status === "drafted").length;
  const anyLive = bks.some((b) => b.status === "live");
  // keep fresh while sandbox creators are on their way, or while clicks may be arriving
  const moving = bks.some((b) => b.is_sandbox && ["invited", "accepted", "changes_requested", "approved"].includes(b.status));

  return (
    <div>
      <AutoRefresh active={moving || anyLive} everyMs={6000} />
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

      <dl className="mt-8 grid max-w-5xl grid-cols-2 gap-x-8 gap-y-5 border-y border-line py-5 sm:grid-cols-5">
        <Metric label="Committed" value={committed} kind="eur" />
        <Metric label="In escrow" value={inEscrow} kind="eur" />
        <Metric label="Paid out" value={paid} kind="eur" />
        <Metric label="Unique clicks" value={clicks} kind="count" live={anyLive} />
        <Metric label="Cost per click" value={cpc} kind="eur2" />
      </dl>

      {drafts ? (
        <p role="status" className="mt-6 max-w-5xl border border-vermilion-ink px-4 py-3 text-small">
          <span className="font-medium">
            {drafts} {drafts === 1 ? "draft is" : "drafts are"} waiting for your review.
          </span>{" "}
          Open the booking to approve it or ask for changes.
        </p>
      ) : null}
      {moving ? <p className="mt-4 text-small text-muted">Sandbox creators reply automatically. This page updates as they do.</p> : null}

      <CampaignBoard bookings={views} today={new Date().toISOString()} />
    </div>
  );
}
