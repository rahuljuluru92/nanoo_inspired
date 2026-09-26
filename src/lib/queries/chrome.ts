import "server-only";
import { asUser } from "@/lib/db";
import { tickSandbox } from "./tick";
import { formatEUR } from "@/lib/money";
import type { WireEvent, WireKind } from "@/lib/types";
import type { Figure } from "@/components/shell/masthead";
import type { NotificationItem } from "@/components/shell/notifications-menu";

export interface Chrome {
  figures: Figure[];
  wire: WireEvent[];
  unread: number;
  notifications: NotificationItem[];
  /** creators only: false until they have finished onboarding */
  hasProfile?: boolean;
}

interface WireRow {
  id: string;
  at: Date;
  kind: string;
  text: string;
}
const toWire = (r: WireRow): WireEvent => ({ id: r.id, at: r.at.toISOString(), kind: r.kind as WireKind, text: r.text });

interface NoteRow {
  id: string;
  at: Date;
  body: string;
  read: boolean;
}
const NOTES_SQL = "select id::text, at, body, read_at is not null as read from notifications order by at desc, id desc limit 8";
const toNote = (r: NoteRow): NotificationItem => ({ id: r.id, at: r.at.toISOString(), body: r.body, read: r.read });

/** What the masthead shows for a brand: wallet, escrow, the latest Wire events, unread count. Also nudges the sandbox creators. */
export async function brandChrome(userId: string): Promise<Chrome> {
  await tickSandbox(userId);
  return asUser(userId, async (c) => {
    const money = await c.query<{ wallet_cents: number; escrow_cents: number }>(
      `select b.wallet_cents,
              coalesce((select sum(amount_cents) from ledger_entries l where l.brand_id = b.id and l.account = 'escrow'), 0)::int as escrow_cents
         from brands b`,
    );
    const wire = await c.query<WireRow>("select id::text, at, kind, text from wire_events order by at desc, id desc limit 6");
    const unread = await c.query<{ n: string }>("select count(*) as n from notifications where read_at is null");
    const notes = await c.query<NoteRow>(NOTES_SQL);
    const m = money.rows[0];
    return {
      figures: m ? [{ label: "Wallet", value: formatEUR(m.wallet_cents) }, { label: "Escrow", value: formatEUR(m.escrow_cents) }] : [],
      wire: wire.rows.map(toWire),
      unread: Number(unread.rows[0]?.n ?? 0),
      notifications: notes.rows.map(toNote),
    };
  });
}

/** For a creator the ticker carries their own notifications ("Halcyon Security sent you an offer…"). */
export async function creatorChrome(userId: string): Promise<Chrome> {
  return asUser(userId, async (c) => {
    const me = await c.query<{ balance_cents: number }>("select balance_cents from creators");
    const feed = await c.query<WireRow>("select id::text, at, kind, body as text from notifications order by at desc, id desc limit 6");
    const unread = await c.query<{ n: string }>("select count(*) as n from notifications where read_at is null");
    const notes = await c.query<NoteRow>(NOTES_SQL);
    const m = me.rows[0];
    return {
      figures: m ? [{ label: "Balance", value: formatEUR(m.balance_cents) }] : [],
      wire: feed.rows.map(toWire),
      unread: Number(unread.rows[0]?.n ?? 0),
      notifications: notes.rows.map(toNote),
      hasProfile: Boolean(m),
    };
  });
}
