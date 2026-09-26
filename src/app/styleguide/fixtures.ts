import type { ReceiptData } from "@/components/receipt/receipt";
import type { ShowItem } from "@/components/receipt/run-of-show";
import type { BriefValue, LineupCreator, WireEvent } from "@/lib/types";

/** Styleguide-only fixtures. Every name here is invented. */
export const OPTIONS = {
  buyers: ["CTOs", "Security leads", "Founders", "RevOps", "Sales leaders", "HR leaders", "Product managers"],
  verticals: ["Fintech", "Devtools", "Security", "Sales-tech", "HR-tech", "Martech", "Data & AI"],
  geo: ["France", "Germany", "UK", "Netherlands", "Spain", "US", "Nordics"],
};

export interface DemoCreator extends LineupCreator {
  tags: { buyers: string[]; verticals: string[]; geo: string[] };
  ctr: number;
}

const p = (low: number, mid: number, high: number) => ({ low, mid, high });

const RAW_CREATORS: Omit<DemoCreator, "id">[] = [
  { handle: "maya-okafor", name: "Maya Okafor", headline: "Security lead, writes on SOC 2 for fintech", verticals: ["Security", "Fintech"], followers: 41200, rateCents: 140000, fit: 0, why: [], projection: p(520, 700, 900), tags: { buyers: ["CTOs", "Security leads"], verticals: ["Security", "Fintech"], geo: ["France", "Germany"] }, ctr: 1.6 },
  { handle: "jonas-brandt", name: "Jonas Brandt", headline: "DevSecOps engineer. Pipelines, secrets, audits", verticals: ["Security", "Devtools"], followers: 18600, rateCents: 90000, fit: 0, why: [], projection: p(380, 500, 640), tags: { buyers: ["CTOs", "Security leads"], verticals: ["Security", "Devtools"], geo: ["Germany", "Netherlands"] }, ctr: 1.9 },
  { handle: "lea-marchetti", name: "Léa Marchetti", headline: "Compliance operations for regulated startups", verticals: ["Fintech", "Security"], followers: 63800, rateCents: 185000, fit: 0, why: [], projection: p(700, 920, 1150), tags: { buyers: ["Security leads", "Founders"], verticals: ["Fintech", "Security"], geo: ["France", "Spain"] }, ctr: 1.3 },
  { handle: "idris-paal", name: "Idris Paal", headline: "Founder. Growth loops for early SaaS", verticals: ["Martech", "Sales-tech"], followers: 9400, rateCents: 60000, fit: 0, why: [], projection: p(240, 320, 410), tags: { buyers: ["Founders", "Sales leaders"], verticals: ["Martech", "Sales-tech"], geo: ["UK", "Nordics"] }, ctr: 2.1 },
  { handle: "nora-wilkes", name: "Nora Wilkes", headline: "Fractional CTO advising Series A teams", verticals: ["Devtools", "Data & AI"], followers: 96500, rateCents: 240000, fit: 0, why: [], projection: p(810, 1100, 1400), tags: { buyers: ["CTOs", "Founders"], verticals: ["Devtools", "Data & AI"], geo: ["US", "UK"] }, ctr: 1.1 },
  { handle: "tomas-ferreira", name: "Tomás Ferreira", headline: "RevOps, forecasting and the boring plumbing", verticals: ["Sales-tech", "Martech"], followers: 27300, rateCents: 105000, fit: 0, why: [], projection: p(420, 560, 720), tags: { buyers: ["RevOps", "Sales leaders"], verticals: ["Sales-tech", "Martech"], geo: ["Spain", "UK"] }, ctr: 1.5 },
  { handle: "anika-rao", name: "Anika Rao", headline: "People ops in scale-ups; hiring that holds up", verticals: ["HR-tech"], followers: 34900, rateCents: 120000, fit: 0, why: [], projection: p(450, 610, 780), tags: { buyers: ["HR leaders"], verticals: ["HR-tech"], geo: ["Netherlands", "Germany"] }, ctr: 1.4 },
  { handle: "sven-lindqvist", name: "Sven Lindqvist", headline: "Platform engineer. Developer experience", verticals: ["Devtools"], followers: 12800, rateCents: 70000, fit: 0, why: [], projection: p(290, 380, 490), tags: { buyers: ["CTOs", "Product managers"], verticals: ["Devtools"], geo: ["Nordics", "Germany"] }, ctr: 2.0 },
];
export const DEMO_CREATORS: DemoCreator[] = RAW_CREATORS.map((c) => ({ ...c, id: c.handle }));

const share = (want: string[], have: string[]) => (want.length === 0 ? 1 : want.filter((w) => have.includes(w)).length / want.length);

/** Styleguide-only stand-in for the real fit score (Phase 4 ships lib/fit.ts with tests). */
export function demoScore(brief: BriefValue): LineupCreator[] {
  return DEMO_CREATORS.map((c) => {
    const a = share(brief.buyers, c.tags.buyers);
    const v = share(brief.verticals, c.tags.verticals);
    const g = share(brief.geo, c.tags.geo);
    const perf = Math.max(0, Math.min(1, (c.ctr / 1.5 - 0.5) / 1));
    const fit = Math.round(100 * (0.4 * a + 0.25 * v + 0.2 * g + 0.15 * perf));
    const why: string[] = [];
    if (brief.buyers.length && a > 0) why.push(`${c.tags.buyers.filter((b) => brief.buyers.includes(b)).join(", ")} in audience`);
    if (brief.verticals.length && v > 0) why.push(c.tags.verticals.filter((x) => brief.verticals.includes(x)).join(" + "));
    if (brief.geo.length && g > 0) why.push(c.tags.geo.filter((x) => brief.geo.includes(x)).join(", "));
    why.push(`CTR ${c.ctr.toFixed(1)}%`);
    return { ...c, fit, why: why.slice(0, 3) };
  }).sort((x, y) => y.fit - x.fit || x.rateCents - y.rateCents);
}

export const INITIAL_BRIEF: BriefValue = { product: "a SOC 2 automation tool", buyers: ["CTOs", "Security leads"], verticals: ["Fintech"], geo: ["France", "Germany"], budgetCents: 600000 };

const now = Date.now();
const ago = (s: number) => new Date(now - s * 1000).toISOString();

export const WIRE: WireEvent[] = [
  { id: "w1", at: ago(12), kind: "click", text: "+3 clicks · Maya Okafor · Launch Q4" },
  { id: "w2", at: ago(95), kind: "went_live", text: "Jonas Brandt went live · Launch Q4" },
  { id: "w3", at: ago(340), kind: "draft_approved", text: "You approved Jonas Brandt’s draft" },
  { id: "w4", at: ago(1200), kind: "offer_accepted", text: "Léa Marchetti accepted · Launch Q4" },
  { id: "w5", at: ago(3600), kind: "hold_placed", text: "€4,150 placed in escrow · 3 offers sent" },
  { id: "w6", at: ago(7200), kind: "payout_released", text: "€900 released to Sven Lindqvist" },
];

export const RECEIPT: ReceiptData = {
  number: "0193",
  creatorName: "Maya Okafor",
  creatorHandle: "maya-okafor",
  brandName: "Halcyon Security",
  campaign: "Launch Q4",
  liveAt: new Date(now - 10 * 86_400_000).toISOString(),
  postUrl: "https://www.example.com/posts/maya-okafor-soc2-in-6-weeks",
  impressions: 18420,
  clicksTotal: 648,
  clicksUnique: 611,
  feeCents: 140000,
  status: "paid",
};

const day = (n: number) => new Date(now + n * 86_400_000).toISOString();
export const SHOW: ShowItem[] = [
  { id: "b1", name: "Maya Okafor", status: "paid", start: day(-12), end: day(-6), clicks: 611, clicksByDay: [12, 44, 96, 140, 120, 90, 61, 48] },
  { id: "b2", name: "Jonas Brandt", status: "live", start: day(-4), end: day(3), clicks: 204, clicksByDay: [8, 40, 71, 55, 30] },
  { id: "b3", name: "Léa Marchetti", status: "drafted", start: day(-1), end: day(6) },
  { id: "b4", name: "Idris Paal", status: "accepted", start: day(0), end: day(9) },
  { id: "b5", name: "Nora Wilkes", status: "invited", start: day(1), end: day(12) },
  { id: "b6", name: "Tomás Ferreira", status: "declined", start: day(-2), end: day(2) },
];
export const SHOW_RANGE = { start: day(-14), end: day(14), today: new Date(now).toISOString() };

export const LEDGER = [
  { at: "26 Sep 14:02", kind: "Hold", ref: "Launch Q4 · 3 offers", amount: "−€4,150", balance: "€7,850" },
  { at: "26 Sep 13:58", kind: "Top-up", ref: "Test funds", amount: "+€12,000", balance: "€12,000" },
  { at: "24 Sep 09:15", kind: "Release", ref: "Sven Lindqvist", amount: "−€900", balance: "€0" },
];
