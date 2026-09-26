import { Chip } from "@/components/ui/chip";
import { Dateline } from "@/components/ui/dateline";
import { costPerClickCents, formatEUR, formatEUR2 } from "@/lib/money";
import { formatDay } from "@/lib/time";

export interface ReceiptData {
  number: string;
  creatorName: string;
  creatorHandle: string;
  brandName: string;
  campaign: string;
  liveAt: string;
  postUrl: string;
  /** Creator-reported; null when not yet reported. */
  impressions: number | null;
  /** who says so: the creator, or simulated by a sandbox creator */
  impressionsSource?: "self_reported" | "seeded";
  clicksTotal: number;
  clicksUnique: number;
  feeCents: number;
  status: "paid" | "live";
}

/** Printed-style proof of a post. Says exactly what is verified (clicks) and what is self-reported (impressions). */
export function Receipt({ data, as: Title = "h2" }: { data: ReceiptData; as?: "h1" | "h2" | "h3" }) {
  const cpc = costPerClickCents(data.feeCents, data.clicksUnique);
  const rows: [string, string, boolean?][] = [
    [data.impressionsSource === "seeded" ? "Impressions (sandbox, simulated)" : "Impressions (self-reported)", data.impressions === null ? "not reported" : data.impressions.toLocaleString("en-IE")],
    ["Tracked clicks · unique", data.clicksUnique.toLocaleString("en-IE")],
    ["Tracked clicks · total", data.clicksTotal.toLocaleString("en-IE")],
    ["Fee", formatEUR(data.feeCents)],
    ["Cost per unique click", cpc === null ? "—" : formatEUR2(cpc), true],
    ["Ledger", data.status === "paid" ? "Paid to creator" : "In escrow"],
  ];
  return (
    <article aria-label={`Receipt ${data.number}`} className="mx-auto w-full max-w-[45rem] animate-print border-y-2 border-dashed border-ink bg-paper-2 px-5 py-6 print:animate-none sm:px-8">
      <div className="flex items-start justify-between gap-4">
        <Dateline>Receipt · post {data.number}</Dateline>
        <Chip tone="green">Verified by redirect</Chip>
      </div>
      <Title className="mt-3 text-display">{data.creatorName}, live {formatDay(data.liveAt)}</Title>
      <p className="mt-1 text-small text-muted">
        for {data.brandName} · {data.campaign}
      </p>
      <dl className="mt-6 grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 border-t border-ink pt-4 font-mono text-small tabular-nums">
        {rows.map(([k, v, good]) => (
          <div key={k} className="col-span-2 grid grid-cols-subgrid">
            <dt className="text-muted">{k}</dt>
            <dd className={good ? "text-green" : undefined}>{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-6 border-t border-line pt-4 text-caption text-muted">
        How this is verified: clicks are counted by Byline&rsquo;s tracked link, bots and link previews excluded, one per visitor per day.
        Impressions are reported by the creator and are not verified.
      </p>
      <p className="mt-3 break-all font-mono text-caption">
        <a className="underline decoration-line-strong underline-offset-4 hover:decoration-ink" href={data.postUrl}>
          {data.postUrl}
        </a>
      </p>
    </article>
  );
}
