import { describe, expect, it } from "vitest";
import { diffBackup } from "./backup-diff";
import type { BackupData, Category, Transaction } from "../db/types";

const cat = (id: string, name: string): Category => ({
  id,
  name,
  type: "expense",
  color: "red",
});

const txn = (id: string, amount: number, type: Transaction["type"] = "expense"): Transaction => ({
  id,
  type,
  amount,
  categoryId: "cat-food",
  date: "2026-10-01",
  createdAt: 1,
  updatedAt: 1,
});

const data = (categories: Category[], transactions: Transaction[]): BackupData => ({
  categories,
  transactions,
  settings: [],
});

describe("diffBackup", () => {
  it("counts added, changed, removed transactions", () => {
    const current = data([], [txn("a", 100), txn("b", 200), txn("c", 300)]);
    const incoming = data([], [
      txn("a", 100), // same
      txn("b", 999), // changed
      txn("d", 400), // added
    ]); // c removed
    const diff = diffBackup(current, incoming);
    expect(diff.transactions).toEqual({ added: 1, changed: 1, removed: 1 });
  });

  it("counts category changes", () => {
    const current = data([cat("x", "Food"), cat("y", "Fun")], []);
    const incoming = data([cat("x", "Food"), cat("y", "Games"), cat("z", "Bills")], []);
    const diff = diffBackup(current, incoming);
    expect(diff.categories).toEqual({ added: 1, changed: 1, removed: 0 });
  });

  it("computes net change as income minus expense delta", () => {
    const current = data([], [txn("a", 500, "income"), txn("b", 200)]);
    const incoming = data([], [txn("a", 700, "income"), txn("b", 100)]);
    // net before: +300, net after: +600 → +300
    expect(diffBackup(current, incoming).netChange).toBe(300);
  });

  it("identical data is all zeros", () => {
    const same = data([cat("x", "Food")], [txn("a", 100, "income")]);
    const diff = diffBackup(same, {
      ...same,
      transactions: [...same.transactions],
    });
    expect(diff.transactions).toEqual({ added: 0, changed: 0, removed: 0 });
    expect(diff.categories).toEqual({ added: 0, changed: 0, removed: 0 });
    expect(diff.netChange).toBe(0);
  });

  it("empty incoming counts everything removed", () => {
    const current = data([cat("x", "Food")], [txn("a", 100)]);
    const incoming = data([], []);
    const diff = diffBackup(current, incoming);
    expect(diff.categories.removed).toBe(1);
    expect(diff.transactions.removed).toBe(1);
    // Removing a 100 expense raises net worth by 100.
    expect(diff.netChange).toBe(100);
  });
});
