import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { loadDesk } from "@/lib/queries/desk";
import { BUYERS, GEOS, VERTICALS, only } from "@/lib/taxonomy";
import type { BriefValue } from "@/lib/types";
import { DeskClient } from "./desk-client";
import { tickSandbox } from "@/lib/queries/tick";

export const metadata: Metadata = { title: "Desk" };

const EXAMPLE: BriefValue = { product: "a SOC 2 automation tool", buyers: ["CTOs", "Security leads"], verticals: ["Fintech"], geo: ["France", "Germany"], budgetCents: 600000 };
const list = (v: string | string[] | undefined) => (Array.isArray(v) ? v.join(",") : (v ?? "")).split(",").map((x) => x.trim()).filter(Boolean);

/** A brief can arrive in the URL (the landing page's live desk hands it over); anything outside the taxonomy is dropped. */
function briefFrom(sp: Record<string, string | string[] | undefined>): BriefValue | null {
  const has = ["product", "buyers", "verticals", "geo", "budget"].some((k) => sp[k] !== undefined);
  if (!has) return null;
  const budget = Number(Array.isArray(sp.budget) ? sp.budget[0] : sp.budget);
  return {
    product: String(Array.isArray(sp.product) ? sp.product[0] : (sp.product ?? "")).slice(0, 80),
    buyers: only(list(sp.buyers), BUYERS),
    verticals: only(list(sp.verticals), VERTICALS),
    geo: only(list(sp.geo), GEOS),
    budgetCents: Number.isFinite(budget) && budget > 0 ? Math.min(Math.round(budget), 1_000_000) * 100 : 0,
  };
}

export default async function DeskPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const s = await requireRole("brand", "/desk");
  await tickSandbox(s.accountId);
  const [sp, desk] = await Promise.all([searchParams, loadDesk(s.accountId)]);
  const fromUrl = briefFrom(sp);
  return (
    <DeskClient
      creators={desk.creators}
      walletCents={desk.walletCents}
      briefNumber={desk.briefNumber}
      today={new Date().toISOString()}
      initialBrief={fromUrl ?? EXAMPLE}
      isExample={!fromUrl}
    />
  );
}
