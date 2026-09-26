import type { Metadata, Viewport } from "next";
import { Instrument_Serif, JetBrains_Mono, Schibsted_Grotesk } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { siteUrl } from "@/lib/site";
import "./globals.css";

const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--nf-serif", display: "swap" });
const sans = Schibsted_Grotesk({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--nf-sans", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--nf-mono", display: "swap" });

const DESCRIPTION = "Write a brief, assemble a lineup of B2B creators, watch the wire, keep the receipt.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "Byline — the wire desk for B2B creator campaigns", template: "%s · Byline" },
  description: DESCRIPTION,
  openGraph: { type: "website", siteName: "Byline", title: "Byline — the wire desk for B2B creator campaigns", description: DESCRIPTION },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#F5F1EA",
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn(serif.variable, sans.variable, mono.variable)}>
      <body>
        {/* First stop for keyboard and screen-reader users on every page; each page's <main> carries id="main". */}
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[70] focus:border focus:border-ink focus:bg-paper-2 focus:px-3 focus:py-2">
          Skip to content
        </a>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
