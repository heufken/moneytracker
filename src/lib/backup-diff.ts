import type { BackupData } from "../db/types";

export interface TableDiff {
  added: number;
  changed: number;
  removed: number;
}

export interface BackupDiff {
  categories: TableDiff;
  transactions: TableDiff;
  /** Net change in stored integer amounts, income minus expense. */
  netChange: number;
}

interface Diffable {
  id: string;
}

/** Compare by id: changed = same id, different JSON. Never reorders keys. */
function diffTable<T extends Diffable>(before: T[], after: T[]): TableDiff {
  const beforeIds = new Set(before.map((r) => r.id));
  const afterIds = new Set(after.map((r) => r.id));
  const beforeById = new Map(before.map((r) => [r.id, r] as const));

  let added = 0;
  let changed = 0;
  for (const row of after) {
    if (!beforeIds.has(row.id)) added++;
    else if (JSON.stringify(row) !== JSON.stringify(beforeById.get(row.id))) changed++;
  }
  const removed = before.filter((r) => !afterIds.has(r.id)).length;
  return { added, changed, removed };
}

/** Difference preview shown in the confirm-import dialog. */
export function diffBackup(current: BackupData, incoming: BackupData): BackupDiff {
  const net = (data: BackupData) =>
    data.transactions.reduce(
      (sum, t) => sum + (t.type === "income" ? t.amount : -t.amount),
      0,
    );
  return {
    categories: diffTable(current.categories, incoming.categories),
    transactions: diffTable(current.transactions, incoming.transactions),
    netChange: net(incoming) - net(current),
  };
}
