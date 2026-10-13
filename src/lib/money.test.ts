import { describe, expect, it } from "vitest";
import { formatMoney, parseMoney, MAX_AMOUNT } from "./money";

describe("formatMoney", () => {
  it("groups with dots for IDR", () => {
    expect(formatMoney(25000)).toBe("Rp 25.000");
    expect(formatMoney(8000000)).toBe("Rp 8.000.000");
    expect(formatMoney(0)).toBe("Rp 0");
  });

  it("keeps negative sign in front of symbol", () => {
    expect(formatMoney(-15000)).toBe("-Rp 15.000");
  });

  it("uses currency code and locale grouping for non-IDR", () => {
    const id = new Intl.NumberFormat("id-ID").format(1200);
    expect(formatMoney(1200, "USD")).toBe(`USD ${id}`);
  });
});

describe("parseMoney", () => {
  it("parses plain, dotted, comma, spaced", () => {
    expect(parseMoney("25000")).toBe(25000);
    expect(parseMoney("25.000")).toBe(25000);
    expect(parseMoney("25,000")).toBe(25000);
    expect(parseMoney("25 000")).toBe(25000);
  });

  it("parses a single leading minus as negative (overdrafts)", () => {
    expect(parseMoney("-250000")).toBe(-250000);
    expect(parseMoney("-25.000")).toBe(-25000);
  });

  it("rejects garbage, empty, zero, and unsafe magnitudes", () => {
    expect(() => parseMoney("abc")).toThrow();
    expect(() => parseMoney("")).toThrow();
    expect(() => parseMoney("25.0.0.1x")).toThrow();
    expect(() => parseMoney("0")).toThrow();
    expect(() => parseMoney("00")).toThrow();
    expect(() => parseMoney("-0")).toThrow();
    expect(() => parseMoney("123456789012345678")).toThrow();
    expect(() => parseMoney(String(MAX_AMOUNT + 1))).toThrow();
  });

  it("accepts the cap exactly", () => {
    expect(parseMoney(String(MAX_AMOUNT))).toBe(MAX_AMOUNT);
  });
});
