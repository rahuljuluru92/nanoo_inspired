import { describe, expect, it } from "vitest";
import { briefToParams, parseBriefParams } from "./brief-params";

describe("parseBriefParams", () => {
  it("returns null when no brief parameter is present", () => {
    expect(parseBriefParams(new URLSearchParams("utm_source=x"))).toBeNull();
    expect(parseBriefParams({})).toBeNull();
  });

  it("parses a full brief from URLSearchParams and from a plain record", () => {
    const expected = { product: "a SOC 2 tool", buyers: ["CTOs", "Security leads"], verticals: ["Fintech"], geo: ["France"], budgetCents: 600000 };
    expect(parseBriefParams(new URLSearchParams({ product: "a SOC 2 tool", buyers: "CTOs,Security leads", verticals: "Fintech", geo: "France", budget: "6000" }))).toEqual(expected);
    expect(parseBriefParams({ product: "a SOC 2 tool", buyers: "CTOs,Security leads", verticals: ["Fintech"], geo: "France", budget: "6000" })).toEqual(expected);
  });

  it("drops anything outside the taxonomy and trims junk", () => {
    const b = parseBriefParams({ buyers: "CTOs, Wizards ,Founders", verticals: "<script>", geo: "Narnia,UK" })!;
    expect(b.buyers).toEqual(["CTOs", "Founders"]);
    expect(b.verticals).toEqual([]);
    expect(b.geo).toEqual(["UK"]);
  });

  it("caps lengths and amounts and survives nonsense", () => {
    const b = parseBriefParams({ product: "x".repeat(200), budget: "99999999999" })!;
    expect(b.product.length).toBe(80);
    expect(b.budgetCents).toBe(1_000_000 * 100);
    expect(parseBriefParams({ budget: "abc" })!.budgetCents).toBe(0);
    expect(parseBriefParams({ budget: "-5" })!.budgetCents).toBe(0);
  });
});

describe("briefToParams", () => {
  it("round-trips a brief", () => {
    const brief = { product: "a tool", buyers: ["CTOs"], verticals: ["Security", "Fintech"], geo: ["UK", "US"], budgetCents: 250000 };
    expect(parseBriefParams(new URLSearchParams(briefToParams(brief)))).toEqual(brief);
  });
  it("omits empty facets", () => {
    expect(briefToParams({ product: "", buyers: [], verticals: [], geo: [], budgetCents: 0 })).toBe("");
  });
});
