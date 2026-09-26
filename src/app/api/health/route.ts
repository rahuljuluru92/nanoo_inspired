import { NextResponse } from "next/server";
import { asOwner } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Proves the deployment is wired to a real database. Counts only; no data. */
export async function GET() {
  try {
    const { rows } = await asOwner((c) =>
      c.query<{ creators: string; brands: string; bookings: string; clicks: string; migrations: string }>(
        `select (select count(*) from creators) creators, (select count(*) from brands) brands,
                (select count(*) from bookings) bookings, (select count(*) from tracking_events) clicks,
                (select count(*) from schema_migrations) migrations`,
      ),
    );
    const r = rows[0]!;
    return NextResponse.json({ ok: true, db: true, counts: { creators: +r.creators, brands: +r.brands, bookings: +r.bookings, tracking_events: +r.clicks }, migrations: +r.migrations });
  } catch {
    return NextResponse.json({ ok: false, db: false }, { status: 503 });
  }
}
