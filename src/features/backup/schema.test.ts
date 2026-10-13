import { describe, expect, it } from "vitest";
import { parseBackupFile } from "./schema";
import type { BackupFile } from "./schema";

const base = (): BackupFile => ({
  version: 1,
  exportedAt: "2026-10-13T00:00:00.000Z",
  data: {
    categories: [{ id: "c1", name: "Food", type: "expense", color: "red" }],
    wallets: [{ id: "w1", name: "Cash", initialBalance: 0 }],
    transactions: [
      { id: "t1", type: "expense", amount: 25000, categoryId: "c1", date: "2026-10-01", createdAt: 1, updatedAt: 1 },
    ],
    settings: [{ key: "currency", value: "IDR" }],
  },
});

const parse = (f: unknown) => parseBackupFile(JSON.stringify(f));

describe("parseBackupFile", () => {
  it("accepts a valid file", () => {
    expect(parse(base()).ok).toBe(true);
  });

  it("tolerates zero amounts from old exports", () => {
    const f = base();
    f.data.transactions[0]!.amount = 0;
    expect(parse(f).ok).toBe(true);
  });

  it("rejects negative and float amounts", () => {
    const neg = base();
    neg.data.transactions[0]!.amount = -1;
    expect(parse(neg)).toMatchObject({ ok: false });
    const float = base();
    float.data.transactions[0]!.amount = 1.5;
    expect(parse(float)).toMatchObject({ ok: false });
  });

  it("rejects amounts past the safe cap", () => {
    const f = base();
    f.data.transactions[0]!.amount = 10_000_000_000_000;
    expect(parse(f)).toMatchObject({ ok: false });
  });

  it("rejects impossible calendar dates", () => {
    const f = base();
    f.data.transactions[0]!.date = "2025-02-31";
    expect(parse(f)).toMatchObject({ ok: false });
    const ok = base();
    ok.data.transactions[0]!.date = "2024-02-29"; // leap year
    expect(parse(ok).ok).toBe(true);
  });

  it("rejects a transaction tagging a wallet missing from the file", () => {
    const f = base();
    f.data.transactions[0]!.walletId = "w-gone";
    expect(parse(f)).toMatchObject({ ok: false });
  });

  it("accepts a transaction with no wallet and files without wallets", () => {
    const noTag = base();
    noTag.data.transactions[0]!.walletId = undefined;
    expect(parse(noTag).ok).toBe(true);
    const preWallets = base();
    delete preWallets.data.wallets;
    expect(parse(preWallets).ok).toBe(true);
  });
});
