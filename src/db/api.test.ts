import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "./db";
import * as api from "./api";
import type { Category, Transaction } from "./types";

// Fresh database per test: populate hook reseeds defaults each time.
beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe("categories", () => {
  it("seeds 6 defaults and currency=IDR", async () => {
    expect((await api.listCategories()).length).toBe(6);
    expect(await api.getSetting("currency")).toBe("IDR");
  });

  it("lists by type", async () => {
    expect((await api.listCategories("income")).length).toBe(2);
    expect((await api.listCategories("expense")).length).toBe(4);
  });

  it("saves and gets roundtrip", async () => {
    const cat: Category = { id: api.newId("cat"), name: "Pets", type: "expense", color: "purple" };
    await api.saveCategory(cat);
    expect((await api.getCategory(cat.id))?.name).toBe("Pets");
  });

  it("blocks deleting a category with transactions", async () => {
    await api.addTransaction({ type: "expense", amount: 25000, categoryId: "cat-food", date: "2026-10-05" });
    await expect(api.deleteCategory("cat-food")).rejects.toThrow(/transaction/);
    expect(await api.getCategory("cat-food")).toBeDefined();
  });

  it("force-deletes a category with transactions when asked", async () => {
    await api.addTransaction({ type: "expense", amount: 1000, categoryId: "cat-food", date: "2026-10-01" });
    await api.deleteCategory("cat-food", { force: true });
    expect(await api.getCategory("cat-food")).toBeUndefined();
    // Orphaned transaction still readable; cleanup is UI's reassign flow.
    expect((await api.listTransactions()).length).toBe(1);
  });
});

describe("transactions", () => {
  it("adds with id, timestamps, string date", async () => {
    const t = await api.addTransaction({
      type: "expense", amount: 25000, categoryId: "cat-food", date: "2026-10-05", note: "lunch",
    });
    expect(t.id).toMatch(/^txn-/);
    expect(t.createdAt).toBe(t.updatedAt);
    expect(typeof t.date).toBe("string");
  });

  it("lists newest first, createdAt breaks same-day ties", async () => {
    vi.setSystemTime(new Date("2026-10-05T07:00:00"));
    await api.addTransaction({ type: "expense", amount: 1, categoryId: "cat-food", date: "2026-10-05" });
    vi.setSystemTime(new Date("2026-10-05T07:30:00"));
    const second = await api.addTransaction({ type: "expense", amount: 2, categoryId: "cat-food", date: "2026-10-05" });
    vi.setSystemTime(new Date("2026-10-06T08:00:00"));
    await api.addTransaction({ type: "expense", amount: 3, categoryId: "cat-food", date: "2026-10-06" });
    const list = await api.listTransactions();
    expect(list.map((t: Transaction) => t.amount)).toEqual([3, 2, 1]);
    expect(list[1]!.id).toBe(second.id);
  });

  it("filters by month range, type, category", async () => {
    await api.addTransaction({ type: "income", amount: 8000000, categoryId: "cat-salary", date: "2026-10-01" });
    await api.addTransaction({ type: "expense", amount: 25000, categoryId: "cat-food", date: "2026-10-05" });
    await api.addTransaction({ type: "expense", amount: 9000, categoryId: "cat-transport", date: "2026-09-20" });

    const oct = await api.listTransactions({ from: "2026-10-01", to: "2026-10-31" });
    expect(oct.length).toBe(2);
    const octExp = await api.listTransactions({ from: "2026-10-01", to: "2026-10-31", type: "expense" });
    expect(octExp.length).toBe(1);
    const food = await api.listTransactions({ categoryId: "cat-food" });
    expect(food.length).toBe(1);
  });

  it("updates fields and bumps updatedAt", async () => {
    vi.setSystemTime(new Date("2026-10-01T08:00:00"));
    const t = await api.addTransaction({ type: "expense", amount: 1000, categoryId: "cat-food", date: "2026-10-01" });
    vi.setSystemTime(new Date("2026-10-01T09:00:00"));
    await api.updateTransaction(t.id, { amount: 2000, note: "edited" });
    const after = await api.getTransaction(t.id);
    expect(after?.amount).toBe(2000);
    expect(after!.updatedAt).toBeGreaterThan(after!.createdAt);
  });

  it("deletes", async () => {
    const t = await api.addTransaction({ type: "expense", amount: 1000, categoryId: "cat-food", date: "2026-10-01" });
    await api.deleteTransaction(t.id);
    expect(await api.getTransaction(t.id)).toBeUndefined();
  });
});

describe("settings", () => {
  it("roundtrips and overwrites", async () => {
    await api.setSetting("currency", "USD");
    expect(await api.getSetting("currency")).toBe("USD");
    await api.setSetting("currency", "IDR");
    expect(await api.getSetting("currency")).toBe("IDR");
  });
});

describe("backup", () => {
  it("replaceAllData snapshots and replaces all tables", async () => {
    const snapshot = await api.readAllData();
    await api.replaceAllData(
      {
        categories: [{ id: "cat-x", name: "X", type: "expense", color: "red" }],
        transactions: [
          {
            id: "txn-1",
            type: "expense",
            amount: 100,
            categoryId: "cat-x",
            date: "2026-10-01",
            createdAt: 1,
            updatedAt: 1,
          },
        ],
        settings: [{ key: "currency", value: "USD" }],
      },
      "import test",
    );

    expect(await api.listTransactions()).toHaveLength(1);
    expect(await api.getSetting("currency")).toBe("USD");

    const backups = await api.listBackups();
    expect(backups).toHaveLength(1);
    expect(backups[0]!.label).toBe("import test");
    expect(backups[0]!.data).toEqual(snapshot);
  });

  it("restoreBackup brings the old data back", async () => {
    const before = await api.readAllData();
    await api.replaceAllData(
      { categories: [], transactions: [], settings: [] },
      "wipe test",
    );
    expect(await api.listTransactions()).toHaveLength(0);

    const backup = (await api.listBackups()).find((b) => b.label === "wipe test")!;
    await api.restoreBackup(backup.id);
    expect(await api.readAllData()).toEqual(before);
  });

  it("keeps only 3 newest snapshots", async () => {
    for (let i = 0; i < 5; i++) {
      await api.replaceAllData(
        { categories: [], transactions: [], settings: [] },
        `wipe ${i}`,
      );
    }
    const backups = await api.listBackups();
    expect(backups).toHaveLength(api.BACKUP_KEEP);
    expect(backups.map((b) => b.label)).toEqual(["wipe 4", "wipe 3", "wipe 2"]);
  });

  it("restoreBackup throws on unknown id", async () => {
    await expect(api.restoreBackup("nope")).rejects.toThrow("No backup");
  });
});
