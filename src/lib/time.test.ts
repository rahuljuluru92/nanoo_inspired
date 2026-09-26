import { describe, expect, it } from "vitest";
import { dateline, formatDay, timeAgo } from "./time";

describe("time", () => {
  it("formats days in UTC so server and browser agree", () => {
    expect(formatDay("2026-09-26T23:59:00Z")).toBe("26 Sep");
    expect(formatDay("2026-09-27T00:01:00Z")).toBe("27 Sep");
  });

  it("describes elapsed time in the coarsest sensible unit", () => {
    const now = Date.parse("2026-09-26T12:00:00Z");
    expect(timeAgo("2026-09-26T11:59:48Z", now)).toBe("12 s ago");
    expect(timeAgo("2026-09-26T11:57:00Z", now)).toBe("3 min ago");
    expect(timeAgo("2026-09-26T10:00:00Z", now)).toBe("2 h ago");
    expect(timeAgo("2026-09-22T12:00:00Z", now)).toBe("4 d ago");
    expect(timeAgo("2026-09-26T12:00:05Z", now)).toBe("0 s ago"); // future timestamps never go negative
  });

  it("builds datelines", () => {
    expect(dateline("Brief", 42, "2026-09-26T09:00:00Z")).toBe("Brief № 0042 · filed 26 Sep");
  });
});
