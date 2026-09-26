import { describe, expect, it } from "vitest";
import { mixToShares, sharesToMix, slugify, validateProfile, type ProfileInput } from "./profile";

const ok: ProfileInput = {
  displayName: "Maya Okafor",
  handle: "maya-okafor",
  headline: "Security lead writing about SOC 2",
  bio: "",
  country: "France",
  verticals: ["Security"],
  followers: 41200,
  rateEuros: 900,
  typicalImpressions: null,
  roles: { CTOs: 0.5 },
  geo: { France: 0.6 },
};

describe("slugify", () => {
  it("folds accents and punctuation into a handle", () => {
    expect(slugify("Léa Marchetti")).toBe("lea-marchetti");
    expect(slugify("  Mei Lin  Chen! ")).toBe("mei-lin-chen");
    expect(slugify("Ünï-cödé")).toBe("uni-code");
  });
  it("caps the length at 40", () => {
    expect(slugify("a".repeat(80)).length).toBe(40);
  });
});

describe("validateProfile", () => {
  it("accepts a good profile", () => {
    expect(validateProfile(ok)).toEqual({});
  });

  it("rejects each bad field with a specific message", () => {
    expect(validateProfile({ ...ok, handle: "Bad Handle" }).handle).toBeDefined();
    expect(validateProfile({ ...ok, handle: "ab" }).handle).toBeDefined();
    expect(validateProfile({ ...ok, headline: "Hi" }).headline).toBeDefined();
    expect(validateProfile({ ...ok, rateEuros: 19 }).rate).toBeDefined();
    expect(validateProfile({ ...ok, rateEuros: 5001 }).rate).toBeDefined();
    expect(validateProfile({ ...ok, verticals: [] }).verticals).toBeDefined();
    expect(validateProfile({ ...ok, verticals: ["a", "b", "c", "d"] }).verticals).toBeDefined();
    expect(validateProfile({ ...ok, country: "" }).country).toBeDefined();
    expect(validateProfile({ ...ok, followers: -1 }).followers).toBeDefined();
    expect(validateProfile({ ...ok, followers: Number.NaN }).followers).toBeDefined();
    expect(validateProfile({ ...ok, bio: "x".repeat(601) }).bio).toBeDefined();
  });

  it("reports every problem at once, not just the first", () => {
    const e = validateProfile({ ...ok, handle: "!", headline: "", rateEuros: 0 });
    expect(Object.keys(e).sort()).toEqual(["handle", "headline", "rate"]);
  });
});

describe("audience mix", () => {
  it("converts percent sliders to shares and drops zeros", () => {
    expect(mixToShares([{ tag: "CTOs", pct: 50 }, { tag: "Founders", pct: 0 }, { tag: "RevOps", pct: 130 }])).toEqual({ CTOs: 0.5, RevOps: 1 });
  });
  it("round-trips and sorts by share", () => {
    const back = sharesToMix({ CTOs: 0.3, Founders: 0.55 });
    expect(back).toEqual([{ tag: "Founders", pct: 55 }, { tag: "CTOs", pct: 30 }]);
    expect(mixToShares(back)).toEqual({ Founders: 0.55, CTOs: 0.3 });
  });
});
