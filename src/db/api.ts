// All database access lives here (AGENTS.md). Components never call Dexie directly.
import { db } from "./db";
import type { Category, Setting, Transaction } from "./types";

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

export type { Category, Setting, Transaction };
