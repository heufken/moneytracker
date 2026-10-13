import type { Category, Transaction, Wallet } from "../../db/types";
import { TransactionRow } from "./TransactionRow";
import { formatMoney } from "../../lib/money";

interface TransactionListProps {
  transactions: Transaction[];
  categories: Category[];
  wallets: Wallet[];
  currency: string;
  onEdit: (t: Transaction) => void;
  onDelete: (t: Transaction) => void;
}

export function TransactionList({ transactions, categories, wallets, currency, onEdit, onDelete }: TransactionListProps) {
  if (transactions.length === 0) {
    return (
      <div className="border-2 border-border bg-card p-8 text-center text-base text-muted-foreground">
        No transactions this month.
      </div>
    );
  }

  const byId = new Map(categories.map((c) => [c.id, c]));
  const walletById = new Map(wallets.map((w) => [w.id, w]));
  const spent = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const earned = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);

  return (
    <div>
      <ul className="border-2 border-border bg-card shadow-hard-md">
        {transactions.map((t) => (
          <TransactionRow
            key={t.id}
            transaction={t}
            category={byId.get(t.categoryId)}
            // "No wallet" only once wallets exist; before that it would be noise on every row
            walletLabel={(t.walletId && walletById.get(t.walletId)?.name) || (wallets.length > 0 ? "No wallet" : undefined)}
            currency={currency}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </ul>
      <p className="mt-2 text-sm text-muted-foreground tnum">
        {transactions.length} transaction{transactions.length === 1 ? "" : "s"} ·{" "}
        <span className="font-semibold text-income-foreground">+{formatMoney(earned, currency)}</span> ·{" "}
        <span className="font-semibold text-expense-foreground">-{formatMoney(spent, currency)}</span>
      </p>
    </div>
  );
}
