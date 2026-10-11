import { describe, expect, it } from "vitest";
import { formatMoney, parseMoney } from "./money";

describe("formatMoney", () => {
  it("groups with dots for IDR", () => {
    expect(formatMoney(25000)).toBe("Rp 25.000");
    expect(formatMoney(8000000)).toBe("Rp 8.000.000");
    expect(formatMoney(0)).toBe("Rp 0");
  });

  it("keeps negative sign in front of symbol", () => {
    expect(formatMoney(-15000)).toBe("-Rp 15.000");
  });

  it("uses currency code as symbol for non-IDR", () => {
    expect(formatMoney(1200, "USD")).toBe("USD 1.200");
  });
});

describe("parseMoney", () => {
  it("parses plain, dotted, comma, spaced", () => {
    expect(parseMoney("25000")).toBe(25000);
    expect(parseMoney("25.000")).toBe(25000);
    expect(parseMoney("25,000")).toBe(25000);
    expect(parseMoney("25 000")).toBe(25000);
  });

  it("rejects garbage and empty", () => {
    expect(() => parseMoney("abc")).toThrow();
    expect(() => parseMoney("")).toThrow();
    expect(() => parseMoney("25.0.0.1x")).toThrow();
  });
});
