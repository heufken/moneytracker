import { describe, expect, it } from "vitest";
import { parseBackupFile, type BackupFile } from "./schema";

/** Loose shape of validFile: lets tests assign invalid values. */
type BadFile = {
  version: number;
  data: {
    transactions: { amount: number; date: string; note?: string }[];
    categories: { color: string }[];
  };
};

const breakable = () => structuredClone(validFile) as unknown as BadFile;

const validFile: BackupFile = {
  version: 1,
  exportedAt: "2026-10-12T00:00:00.000Z",
  data: {
    categories: [
      { id: "cat-food", name: "Food", type: "expense", color: "red" },
    ],
    transactions: [
      {
        id: "txn-1",
        type: "expense",
        amount: 12500,
        categoryId: "cat-food",
        date: "2026-10-01",
        note: "lunch",
        createdAt: 1,
        updatedAt: 1,
      },
    ],
    settings: [{ key: "currency", value: "IDR" }],
  },
};

describe("parseBackupFile", () => {
  it("accepts a valid file", () => {
    const result = parseBackupFile(JSON.stringify(validFile));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.file.data.transactions[0]!.amount).toBe(12500);
  });

  it("rejects broken JSON with a safe message", () => {
    const result = parseBackupFile("{not json");
    expect(result).toEqual({ ok: false, error: "Not valid JSON." });
  });

  it("rejects float amounts", () => {
    const bad = breakable();
    bad.data.transactions[0]!.amount = 12.5;
    const result = parseBackupFile(JSON.stringify(bad));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("amount");
  });

  it("rejects wrong version", () => {
    const bad = breakable();
    bad.version = 2;
    const result = parseBackupFile(JSON.stringify(bad));
    expect(result.ok).toBe(false);
  });

  it("rejects UTC-style transaction dates", () => {
    const bad = breakable();
    bad.data.transactions[0]!.date = "2026-10-01T00:00:00.000Z";
    const result = parseBackupFile(JSON.stringify(bad));
    expect(result.ok).toBe(false);
  });

  it("rejects unknown category color", () => {
    const bad = breakable();
    bad.data.categories[0]!.color = "#ff0000";
    const result = parseBackupFile(JSON.stringify(bad));
    expect(result.ok).toBe(false);
  });

  it("allows missing optional note", () => {
    const good = breakable();
    delete good.data.transactions[0]!.note;
    expect(parseBackupFile(JSON.stringify(good)).ok).toBe(true);
  });
});
