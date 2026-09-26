import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { loadDesk } from "@/lib/queries/desk";
import { parseBriefParams } from "@/lib/brief-params";
import type { BriefValue } from "@/lib/types";
import { DeskClient } from "./desk-client";
import { tickSandbox } from "@/lib/queries/tick";

export const metadata: Metadata = { title: "Desk" };

const EXAMPLE: BriefValue = { product: "a SOC 2 automation tool", buyers: ["CTOs", "Security leads"], verticals: ["Fintech"], geo: ["France", "Germany"], budgetCents: 600000 };
export default async function DeskPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const s = await requireRole("brand", "/desk");
  await tickSandbox(s.accountId);
  const [sp, desk] = await Promise.all([searchParams, loadDesk(s.accountId)]);
  const fromUrl = parseBriefParams(sp);
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
