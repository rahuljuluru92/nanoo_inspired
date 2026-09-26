"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { topUpAction } from "@/app/(brand)/desk/actions";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { formatEUR } from "@/lib/money";

const PRESETS = [100000, 500000, 1000000];

/** Test-mode funds. The ledger entry is real; no money moves anywhere. */
export function TopUp() {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState<number | null>(null);
  return (
    <div className="flex flex-wrap gap-3">
      {PRESETS.map((c) => (
        <Button
          key={c}
          pending={busy === c}
          disabled={busy !== null}
          onClick={async () => {
            setBusy(c);
            const r = await topUpAction(c);
            setBusy(null);
            if (r.ok) {
              toast.push({ title: "Test funds added", body: `Wallet: ${formatEUR(r.walletCents)}` });
              router.refresh();
            } else toast.push({ title: "Couldn’t add funds", body: r.error.message, tone: "error" });
          }}
        >
          Add {formatEUR(c)}
        </Button>
      ))}
    </div>
  );
}
