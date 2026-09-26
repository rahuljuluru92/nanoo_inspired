import type { Metadata } from "next";
import { AutoRefresh } from "@/components/ui/auto-refresh";
import { Dateline } from "@/components/ui/dateline";
import { EmptyState } from "@/components/ui/empty-state";
import { WireItem } from "@/components/wire/wire-item";
import { requireRole } from "@/lib/auth";
import { asUser } from "@/lib/db";
import type { WireKind } from "@/lib/types";
import { tickSandbox } from "@/lib/queries/tick";

export const metadata: Metadata = { title: "Wire" };

export default async function Wire() {
  const s = await requireRole("brand", "/wire");
  await tickSandbox(s.accountId);
  const { rows } = await asUser(s.accountId, (c) => c.query<{ id: string; at: Date; kind: string; text: string }>("select id::text, at, kind, text from wire_events order by at desc, id desc limit 100"));
  return (
    <div>
      <AutoRefresh everyMs={8000} />
      <Dateline>The Wire · latest {rows.length}</Dateline>
      <h1 className="mt-1 text-display">Everything, as it happens</h1>
      {rows.length === 0 ? (
        <div className="mt-8">
          <EmptyState title="The wire is quiet" body="Offers, drafts, go-lives and payouts appear here the moment they happen." />
        </div>
      ) : (
        <ol className="mt-8 max-w-3xl border-b border-line">
          {rows.map((r) => (
            <WireItem key={r.id} event={{ id: r.id, at: r.at.toISOString(), kind: r.kind as WireKind, text: r.text }} />
          ))}
        </ol>
      )}
    </div>
  );
}
