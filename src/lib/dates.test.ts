import { describe, expect, it } from "vitest";
import { monthRange, todayISO } from "./dates";

describe("todayISO", () => {
  it("returns YYYY-MM-DD in local time", () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("monthRange", () => {
  it("returns first and last day inclusive", () => {
    expect(monthRange("2026-10-11")).toEqual({ from: "2026-10-01", to: "2026-10-31" });
  });

  it("handles leap February", () => {
    expect(monthRange("2028-02-05")).toEqual({ from: "2028-02-01", to: "2028-02-29" });
  });

  it("handles non-leap February", () => {
    expect(monthRange("2027-02-05")).toEqual({ from: "2027-02-01", to: "2027-02-28" });
  });

  it("handles year boundary", () => {
    expect(monthRange("2026-12-15")).toEqual({ from: "2026-12-01", to: "2026-12-31" });
  });
});
