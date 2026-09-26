import { describe, expect, it } from "vitest";
import { toAppError } from "./errors";

describe("toAppError", () => {
  it("maps known RPC errors to human messages", () => {
    expect(toAppError({ message: "invalid_url" }).message).toMatch(/https/);
    expect(toAppError({ message: "already_booked" }).code).toBe("already_booked");
  });

  it("turns the shortfall hint into euros", () => {
    const e = toAppError({ message: "insufficient_funds", hint: "60000" });
    expect(e.code).toBe("insufficient_funds");
    expect(e.message).toContain("€600");
  });

  it("never leaks unknown errors", () => {
    const e = toAppError(new Error('relation "secret_table" does not exist'));
    expect(e.code).toBe("unexpected");
    expect(e.message).not.toContain("secret_table");
  });
});
