import type { Category, Transaction } from "../db/types";

export interface MonthTotals {
  income: number;
  expense: number;
  net: number;
}

export function monthTotals(transactions: Transaction[]): MonthTotals {
  let income = 0;
  let expense = 0;
  for (const t of transactions) {
    if (t.type === "income") income += t.amount;
    else expense += t.amount;
  }
  return { income, expense, net: income - expense };
}

export interface CategorySpend {
  categoryId: string;
  name: string;
  color: string;
  total: number;
}

/** Expense totals grouped by category, largest first. */
export function spendingByCategory(
  transactions: Transaction[],
  categories: Category[],
): CategorySpend[] {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const totals = new Map<string, number>();
  for (const t of transactions) {
    if (t.type !== "expense") continue;
    totals.set(t.categoryId, (totals.get(t.categoryId) ?? 0) + t.amount);
  }
  return [...totals.entries()]
    .map(([categoryId, total]) => ({
      categoryId,
      name: byId.get(categoryId)?.name ?? "Unknown",
      color: byId.get(categoryId)?.color ?? "blue",
      total,
    }))
    .sort((a, b) => b.total - a.total);
}

/** Each balance as a 0–1 fraction of the positive total. Overdrawn (≤0) wallets get 0 so bars never go negative. */
export function balanceShares(balances: number[]): number[] {
  const pos = balances.reduce((s, b) => s + Math.max(b, 0), 0);
  return balances.map((b) => (pos > 0 ? Math.max(b, 0) / pos : 0));
}

export interface MonthlyFlow {
  /** `YYYY-MM` */
  month: string;
  income: number;
  expense: number;
}

/** Income vs expense per month for the N months ending at `endMonth` (inclusive), oldest first. */
export function monthlyFlow(
  transactions: Transaction[],
  endMonth: string,
  months = 6,
): MonthlyFlow[] {
  const [ey, em] = endMonth.split("-").map(Number);
  const start = new Date(ey!, em! - months, 1);
  const flows: MonthlyFlow[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(ey!, em! - 1 - i, 1);
    flows.push({ month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, income: 0, expense: 0 });
  }
  const index = new Map(flows.map((f, i) => [f.month, i]));
  for (const t of transactions) {
    if (t.date < `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-01`) continue;
    const i = index.get(t.date.slice(0, 7));
    if (i === undefined) continue;
    if (t.type === "income") flows[i]!.income += t.amount;
    else flows[i]!.expense += t.amount;
  }
  return flows;
}
