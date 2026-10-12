// All database access lives here (AGENTS.md). Components never call Dexie directly.
import { db } from "./db";
import type { Backup, BackupData, Category, Setting, Transaction, Wallet } from "./types";

// ---------- ids ----------

export function newId(prefix: string): string {
  // crypto.randomUUID is available in all modern browsers and Node 19+.
  return `${prefix}-${crypto.randomUUID()}`;
}

// ---------- categories ----------

export function listCategories(type?: Category["type"]): Promise<Category[]> {
  return type ? db.categories.where("type").equals(type).toArray() : db.categories.toArray();
}

export function getCategory(id: string): Promise<Category | undefined> {
  return db.categories.get(id);
}

export async function saveCategory(category: Category): Promise<void> {
  await db.categories.put(category);
}

/** Count transactions referencing a category — used to guard deletion. */
export function countTransactionsByCategory(categoryId: string): Promise<number> {
  return db.transactions.where("categoryId").equals(categoryId).count();
}

export async function deleteCategory(
  categoryId: string,
  opts: { force?: boolean } = {},
): Promise<void> {
  const count = await countTransactionsByCategory(categoryId);
  if (count > 0 && !opts.force) {
    throw new Error(
      `Category has ${count} transaction(s). Reassign or confirm before deleting.`,
    );
  }
  await db.categories.delete(categoryId);
}

// ---------- wallets ----------

export function listWallets(): Promise<Wallet[]> {
  return db.wallets.toArray();
}

export async function saveWallet(wallet: Wallet): Promise<void> {
  await db.wallets.put(wallet);
}

/** Count transactions referencing a wallet — used to guard deletion. */
export function countTransactionsByWallet(walletId: string): Promise<number> {
  return db.transactions.where("walletId").equals(walletId).count();
}

export async function deleteWallet(
  walletId: string,
  opts: { force?: boolean } = {},
): Promise<void> {
  const count = await countTransactionsByWallet(walletId);
  if (count > 0 && !opts.force) {
    throw new Error(
      `Wallet has ${count} transaction(s). Reassign or confirm before deleting.`,
    );
  }
  await db.transaction("rw", [db.wallets, db.transactions], async () => {
    await db.wallets.delete(walletId);
    // Force-delete keeps transactions; drop the dangling wallet tag.
    await db.transactions.where("walletId").equals(walletId).modify({ walletId: undefined });
  });
}

/** Current balance = opening balance + income − expense for the wallet. */
export async function walletBalance(walletId: string): Promise<number> {
  const wallet = await db.wallets.get(walletId);
  if (!wallet) throw new Error(`No wallet with id ${walletId}`);
  const txns = await db.transactions.where("walletId").equals(walletId).toArray();
  let balance = wallet.initialBalance;
  for (const t of txns) balance += t.type === "income" ? t.amount : -t.amount;
  return balance;
}

// ---------- transactions ----------

export interface TransactionFilters {
  /** Inclusive `YYYY-MM-DD` bounds. Omit either side for open range. */
  from?: string;
  to?: string;
  type?: Transaction["type"];
  categoryId?: string;
}

/** Newest first (date desc, then createdAt desc for same-day ties). */
export async function listTransactions(
  filters: TransactionFilters = {},
): Promise<Transaction[]> {
  const { from, to, type, categoryId } = filters;
  if (from && to) {
    const rows = await db.transactions
      .where("date")
      .between(from, to, true, true)
      .and((t) => (!type || t.type === type) && (!categoryId || t.categoryId === categoryId))
      .toArray();
    return rows.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt - a.createdAt));
  }
  // Open-ended: filter whole table.
  const rows = await db.transactions
    .filter((t) => (!from || t.date >= from) && (!to || t.date <= to) && (!type || t.type === type) && (!categoryId || t.categoryId === categoryId))
    .toArray();
  return rows.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt - a.createdAt));
}

export function getTransaction(id: string): Promise<Transaction | undefined> {
  return db.transactions.get(id);
}

export interface NewTransactionInput {
  type: Transaction["type"];
  amount: number;
  categoryId: string;
  walletId?: string;
  date: string;
  note?: string;
}

export async function addTransaction(input: NewTransactionInput): Promise<Transaction> {
  const now = Date.now();
  const transaction: Transaction = {
    id: newId("txn"),
    ...input,
    createdAt: now,
    updatedAt: now,
  };
  await db.transactions.add(transaction);
  return transaction;
}

export async function updateTransaction(
  id: string,
  changes: Partial<Omit<Transaction, "id" | "createdAt">>,
): Promise<void> {
  await db.transactions.update(id, { ...changes, updatedAt: Date.now() });
}

export function deleteTransaction(id: string): Promise<void> {
  return db.transactions.delete(id);
}

// ---------- settings ----------

export async function getSetting(key: string): Promise<string | undefined> {
  const row = await db.settings.get(key);
  return row?.value;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db.settings.put({ key, value });
}

// ---------- backup ----------

/** Automatic snapshots kept before older ones are pruned. */
export const BACKUP_KEEP = 3;

/** Read all user tables: the export payload and pre-import snapshots. */
export async function readAllData(): Promise<BackupData> {
  const [categories, transactions, wallets, settings] = await Promise.all([
    db.categories.toArray(),
    db.transactions.toArray(),
    db.wallets.toArray(),
    db.settings.toArray(),
  ]);
  return { categories, transactions, wallets, settings };
}

/**
 * Replace all user tables with `data`, saving current data as a labeled
 * snapshot first. Snapshot, replace, and prune all run in one IndexedDB
 * transaction: a crash mid-import rolls back everything, leaving the old
 * data and snapshot list exactly as they were. Restores reuse this path,
 * so the pre-restore state is snapshotted too.
 */
export async function replaceAllData(data: BackupData, label: string): Promise<void> {
  await db.transaction(
    "rw",
    [db.categories, db.transactions, db.wallets, db.settings, db.backups],
    async () => {
      const current = await readAllData();
      const latest = (await listBackups())[0];
      await db.backups.put({
        id: newId("backup"),
        label,
        // Date.now() repeats within a millisecond: bump past the newest
        // snapshot so ordering and pruning never see ties.
        createdAt: Math.max(Date.now(), (latest?.createdAt ?? 0) + 1),
        data: current,
      });
      await Promise.all([db.categories.clear(), db.transactions.clear(), db.wallets.clear(), db.settings.clear()]);
      await Promise.all([
        db.categories.bulkPut(data.categories),
        db.transactions.bulkPut(data.transactions),
        db.wallets.bulkPut(data.wallets ?? []),
        db.settings.bulkPut(data.settings),
      ]);
      const stale = (await listBackups()).slice(BACKUP_KEEP).map((b) => b.id);
      if (stale.length > 0) await db.backups.bulkDelete(stale);
    },
  );
}

/** Snapshots, newest first. */
export function listBackups(): Promise<Backup[]> {
  return db.backups.orderBy("createdAt").reverse().toArray();
}

export async function restoreBackup(id: string): Promise<void> {
  const backup = await db.backups.get(id);
  if (!backup) throw new Error(`No backup with id ${id}`);
  await replaceAllData(backup.data, "before restore");
}

export type { Backup, BackupData, Category, Setting, Transaction, Wallet };
