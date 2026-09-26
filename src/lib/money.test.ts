import { describe, expect, it } from "vitest";
import { costPerClickCents, formatCount, formatEUR, formatEUR2, formatRange } from "./money";

describe("money", () => {
  it("formats whole euros without decimals and cents with two", () => {
    expect(formatEUR(140000)).toBe("€1,400");
    expect(formatEUR(229)).toBe("€2.29");
    expect(formatEUR2(140000)).toBe("€1,400.00");
  });

  it("compacts counts", () => {
    expect(formatCount(520)).toBe("520");
    expect(formatCount(1900)).toBe("1.9k");
    expect(formatCount(2000)).toBe("2k");
    expect(formatCount(1_240_000)).toBe("1.2M");
    expect(formatRange(520, 900)).toBe("520–900");
    expect(formatRange(1600, 2690)).toBe("1.6k–2.7k");
  });

  it("guards cost per click against zero clicks", () => {
    expect(costPerClickCents(415000, 0)).toBeNull();
    expect(costPerClickCents(415000, 1810)).toBe(229);
  });
});
