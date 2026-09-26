import { describe, expect, it } from "vitest";
import { WEIGHTS, rankLineup, scoreCreator, verticalMedians, type CatalogCreator, type FitBrief } from "./fit";
import { projectClicks } from "./projection";

const mk = (over: Partial<CatalogCreator> & { handle: string }): CatalogCreator => ({
  id: over.handle,
  name: over.handle,
  headline: "",
  verticals: ["Security"],
  followers: 10000,
  rateCents: 100000,
  audience: { roles: { CTOs: 0.5, "Security leads": 0.2 }, geo: { France: 0.6, Germany: 0.2 } },
  impP25: 1000,
  impP50: 2000,
  impP75: 3000,
  ctr: 1.5,
  isSandbox: true,
  verified: false,
  ...over,
});
const empty: FitBrief = { buyers: [], verticals: [], geo: [], budgetCents: 0 };
const medians = (cs: CatalogCreator[]) => verticalMedians(cs);

describe("fit weights", () => {
  it("sum to exactly one", () => {
    expect(WEIGHTS.audience + WEIGHTS.vertical + WEIGHTS.geo + WEIGHTS.performance).toBeCloseTo(1, 10);
  });
});

describe("scoreCreator", () => {
  const a = mk({ handle: "a" });

  it("gives an empty brief full marks on the three brief facets, so only performance decides", () => {
    const s = scoreCreator(a, empty, medians([a]));
    expect(s.parts.audience).toBe(1);
    expect(s.parts.vertical).toBe(1);
    expect(s.parts.geo).toBe(1);
    expect(s.score).toBeGreaterThanOrEqual(85);
  });

  it("rewards audience overlap and caps it at half your buyers", () => {
    const half = mk({ handle: "half", audience: { roles: { CTOs: 0.5 }, geo: {} } });
    const most = mk({ handle: "most", audience: { roles: { CTOs: 0.9 }, geo: {} } });
    const some = mk({ handle: "some", audience: { roles: { CTOs: 0.25 }, geo: {} } });
    const brief = { ...empty, buyers: ["CTOs"] };
    expect(scoreCreator(half, brief, medians([half])).parts.audience).toBe(1);
    expect(scoreCreator(most, brief, medians([most])).parts.audience).toBe(1);
    expect(scoreCreator(some, brief, medians([some])).parts.audience).toBeCloseTo(0.5, 5);
  });

  it("scores vertical as the share of requested verticals the creator covers", () => {
    const c = mk({ handle: "c", verticals: ["Security", "Fintech"] });
    expect(scoreCreator(c, { ...empty, verticals: ["Security", "Fintech"] }, medians([c])).parts.vertical).toBe(1);
    expect(scoreCreator(c, { ...empty, verticals: ["Security", "Devtools"] }, medians([c])).parts.vertical).toBe(0.5);
    expect(scoreCreator(c, { ...empty, verticals: ["Devtools"] }, medians([c])).parts.vertical).toBe(0);
  });

  it("scores performance against the vertical median and clamps at both ends", () => {
    const slow = mk({ handle: "slow", ctr: 0.5 });
    const typical = mk({ handle: "typ", ctr: 1.5 });
    const fast = mk({ handle: "fast", ctr: 3.5 });
    const all = [slow, typical, fast];
    const m = medians(all); // median CTR = 1.5
    expect(scoreCreator(slow, empty, m).parts.performance).toBe(0);
    expect(scoreCreator(typical, empty, m).parts.performance).toBeCloseTo(0.5, 5);
    expect(scoreCreator(fast, empty, m).parts.performance).toBe(1);
  });

  it("always returns a score between 0 and 100", () => {
    const worst = mk({ handle: "w", verticals: ["Legal-tech"], audience: { roles: {}, geo: {} }, ctr: 0.1 });
    const brief: FitBrief = { buyers: ["CTOs"], verticals: ["Security"], geo: ["France"], budgetCents: 0 };
    const s = scoreCreator(worst, brief, { "Legal-tech": 2 });
    expect(s.score).toBeGreaterThanOrEqual(0);
    expect(s.score).toBeLessThanOrEqual(100);
  });

  it("explains itself in words", () => {
    const brief: FitBrief = { buyers: ["CTOs", "Security leads"], verticals: ["Security"], geo: ["France"], budgetCents: 0 };
    const s = scoreCreator(a, brief, medians([a]));
    expect(s.why.length).toBeGreaterThan(0);
    expect(s.why.length).toBeLessThanOrEqual(3);
    expect(s.why.join(" ")).toMatch(/CTOs 50% of audience/);
    expect(s.why.join(" ")).toMatch(/Security/);
    expect(s.why.join(" ")).toMatch(/France 60%/);
  });

  it("falls back to the click-through rate when nothing else can be said", () => {
    expect(scoreCreator(a, empty, { Security: 1.5 }).why).toEqual(["CTR 1.5%"]);
  });
});

describe("rankLineup", () => {
  const cs = [
    mk({ handle: "cto-fr", audience: { roles: { CTOs: 0.7 }, geo: { France: 0.7 } } }),
    mk({ handle: "cto-us", audience: { roles: { CTOs: 0.7 }, geo: { US: 0.7 } } }),
    mk({ handle: "hr-fr", verticals: ["HR-tech"], audience: { roles: { "HR leaders": 0.7 }, geo: { France: 0.7 } } }),
  ];

  it("puts the best match first and is deterministic", () => {
    const brief: FitBrief = { buyers: ["CTOs"], verticals: ["Security"], geo: ["France"], budgetCents: 0 };
    const r = rankLineup(cs, brief);
    expect(r.map((x) => x.handle)).toEqual(["cto-fr", "cto-us", "hr-fr"]);
    expect(rankLineup(cs, brief)).toEqual(r);
    expect(r[0]!.fit).toBeGreaterThan(r[1]!.fit);
  });

  it("re-ranks when the brief changes", () => {
    const brief: FitBrief = { buyers: ["HR leaders"], verticals: ["HR-tech"], geo: [], budgetCents: 0 };
    expect(rankLineup(cs, brief)[0]!.handle).toBe("hr-fr");
  });

  it("breaks ties by higher CTR, then lower price", () => {
    const x = mk({ handle: "x", ctr: 2, rateCents: 200000 });
    const y = mk({ handle: "y", ctr: 2, rateCents: 100000 });
    expect(rankLineup([x, y], empty).map((r) => r.handle)).toEqual(["y", "x"]);
  });

  it("carries price, id and projection through", () => {
    const r = rankLineup([cs[0]!], empty)[0]!;
    expect(r.id).toBe("cto-fr");
    expect(r.rateCents).toBe(100000);
    expect(r.projection).toEqual({ low: 15, mid: 30, high: 45 });
  });
});

describe("projectClicks", () => {
  it("is impressions times CTR at three percentiles, always ordered", () => {
    expect(projectClicks(1000, 2000, 3000, 1.5)).toEqual({ low: 15, mid: 30, high: 45 });
    const odd = projectClicks(3000, 2000, 1000, 1.5); // out-of-order history must never invert the range
    expect(odd.low).toBeLessThanOrEqual(odd.mid);
    expect(odd.mid).toBeLessThanOrEqual(odd.high);
  });
});
