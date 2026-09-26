import type { Metadata, Viewport } from "next";
import { Instrument_Serif, JetBrains_Mono, Schibsted_Grotesk } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import "./globals.css";

const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--nf-serif", display: "swap" });
const sans = Schibsted_Grotesk({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--nf-sans", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--nf-mono", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Byline — the wire desk for B2B creator campaigns", template: "%s · Byline" },
  description: "Write a brief, assemble a lineup of B2B creators, watch the wire, keep the receipt.",
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
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
