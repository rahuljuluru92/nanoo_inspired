import { describe, expect, it } from "vitest";
import { halftoneDots } from "./halftone";

describe("halftoneDots", () => {
  it("is deterministic for a seed", () => {
    expect(halftoneDots("maya-okafor")).toEqual(halftoneDots("maya-okafor"));
  });

  it("differs between seeds", () => {
    expect(halftoneDots("maya-okafor")).not.toEqual(halftoneDots("jonas-brandt"));
  });

  it("stays inside the 0–100 viewBox and has a plausible dot count", () => {
    for (const seed of ["a", "b", "maya-okafor", "jonas-brandt", "", "🙂"]) {
      const dots = halftoneDots(seed);
      expect(dots.length).toBeGreaterThan(40);
      expect(dots.length).toBeLessThan(324);
      for (const d of dots) {
        expect(d.x - d.r).toBeGreaterThanOrEqual(-1);
        expect(d.x + d.r).toBeLessThanOrEqual(101);
        expect(d.y - d.r).toBeGreaterThanOrEqual(-1);
        expect(d.y + d.r).toBeLessThanOrEqual(101);
        expect(d.r).toBeGreaterThan(0);
      }
    }
  });
});
