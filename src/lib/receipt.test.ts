import { describe, expect, it } from "vitest";
import { receiptNumber } from "./receipt";

describe("receiptNumber", () => {
  it("is four digits and stable for a code", () => {
    expect(receiptNumber("wb289eab")).toMatch(/^\d{4}$/);
    expect(receiptNumber("wb289eab")).toBe(receiptNumber("wb289eab"));
  });
  it("differs between codes", () => {
    expect(receiptNumber("k7x2m9pq")).not.toBe(receiptNumber("wb289eab"));
  });
});
