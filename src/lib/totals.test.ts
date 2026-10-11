import { describe, expect, it } from "vitest";
import { monthTotals, monthlyFlow, spendingByCategory } from "./totals";
import type { Category, Transaction } from "../db/types";

const cat = (id: string, name: string, color: string): Category => ({
  id, name, type: "expense", color: color as Category["color"],
});
const txn = (id: string, type: Transaction["type"], amount: number, categoryId: string, date: string): Transaction => ({
  id, type, amount, categoryId, date, createdAt: 0, updatedAt: 0,
});

describe("monthTotals", () => {
  it("sums income, expense, net", () => {
    const t = [
      txn("a", "income", 8000000, "s", "2026-10-01"),
      txn("b", "expense", 25000, "f", "2026-10-05"),
      txn("c", "expense", 9000, "t", "2026-10-06"),
    ];
    expect(monthTotals(t)).toEqual({ income: 8000000, expense: 34000, net: 7966000 });
  });

  it("empty month is all zero", () => {
    expect(monthTotals([])).toEqual({ income: 0, expense: 0, net: 0 });
  });

  it("negative net when expenses win", () => {
    const t = [
      txn("a", "income", 100, "s", "2026-10-01"),
      txn("b", "expense", 300, "f", "2026-10-05"),
    ];
    expect(monthTotals(t).net).toBe(-200);
  });
});

describe("spendingByCategory", () => {
  it("groups expenses only, largest first, keeps category meta", () => {
    const cats = [cat("food", "Food", "red"), cat("transport", "Transport", "blue")];
    const t = [
      txn("a", "expense", 10000, "food", "2026-10-01"),
      txn("b", "expense", 30000, "transport", "2026-10-02"),
      txn("c", "expense", 5000, "food", "2026-10-03"),
      txn("d", "income", 9999, "food", "2026-10-04"),
    ];
    expect(spendingByCategory(t, cats)).toEqual([
      { categoryId: "transport", name: "Transport", color: "blue", total: 30000 },
      { categoryId: "food", name: "Food", color: "red", total: 15000 },
    ]);
  });

  it("unknown category gets placeholder meta", () => {
    const t = [txn("a", "expense", 100, "ghost", "2026-10-01")];
    expect(spendingByCategory(t, [])[0]).toMatchObject({ name: "Unknown", total: 100 });
  });
});

describe("monthlyFlow", () => {
  it("builds 6 months ending at endMonth, oldest first, sums per month", () => {
    const t = [
      txn("a", "income", 100, "s", "2026-05-15"),
      txn("b", "expense", 40, "f", "2026-05-20"),
      txn("c", "income", 200, "s", "2026-10-01"),
      txn("d", "expense", 80, "f", "2026-10-05"),
    ];
    const flow = monthlyFlow(t, "2026-10", 6);
    expect(flow.map((f) => f.month)).toEqual([
      "2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10",
    ]);
    expect(flow[0]).toEqual({ month: "2026-05", income: 100, expense: 40 });
    expect(flow[5]).toEqual({ month: "2026-10", income: 200, expense: 80 });
    expect(flow[1]).toEqual({ month: "2026-06", income: 0, expense: 0 });
  });

  it("ignores transactions before the window", () => {
    const t = [txn("a", "income", 100, "s", "2026-03-01")];
    const flow = monthlyFlow(t, "2026-10", 6);
    expect(flow.every((f) => f.income === 0)).toBe(true);
  });

  it("handles year rollover in the window", () => {
    const t = [txn("a", "income", 50, "s", "2026-03-15")];
    const flow = monthlyFlow(t, "2027-01", 6);
    expect(flow.map((f) => f.month)).toEqual([
      "2026-08", "2026-09", "2026-10", "2026-11", "2026-12", "2027-01",
    ]);
    expect(flow.every((f) => f.income === 0)).toBe(true); // 2026-03 outside window
  });
});
