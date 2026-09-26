import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Wordmark } from "@/components/art/wordmark";
import { Receipt } from "@/components/receipt/receipt";
import { loadReceipt, toReceiptData } from "@/lib/queries/receipts";

const load = loadReceipt;

// Receipts are unlisted: shareable by link, never indexed.
export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const r = await load((await params).code);
  return { title: r ? `Receipt · ${r.creator_name}` : "Receipt not found", robots: { index: false, follow: false } };
}

export default async function ReceiptPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const r = await load(code);
  if (!r) notFound();
  const data = toReceiptData(r);
  return (
    <main className="mx-auto min-h-dvh max-w-3xl px-4 pb-20 pt-6 sm:px-6">
      <header className="flex items-center justify-between border-b border-ink pb-2 print:hidden">
        <Wordmark />
        <Link href={`/c/${r.handle}`} className="inline-flex min-h-11 items-center text-small underline decoration-line-strong underline-offset-4 hover:decoration-ink">
          {r.creator_name}’s media kit
        </Link>
      </header>
      <div className="mt-10">
        <Receipt data={data} as="h1" />
      </div>
      <p className="mx-auto mt-6 max-w-[45rem] text-caption text-muted print:hidden">
        This page is public to anyone with the link. {r.brand_name} can revoke it at any time. Byline counts clicks itself; nothing on this page can be edited by the creator or the brand.
      </p>
    </main>
  );
}
