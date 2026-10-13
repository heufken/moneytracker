import { Pencil, Trash2, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { formatMoney } from "../../lib/money";
import type { Category, Transaction } from "../../db/types";

interface TransactionRowProps {
  transaction: Transaction;
  category?: Category;
  currency: string;
  onEdit: (t: Transaction) => void;
  onDelete: (t: Transaction) => void;
}

export function TransactionRow({ transaction: t, category, currency, onEdit, onDelete }: TransactionRowProps) {
  const income = t.type === "income";
  const amount = `${income ? "+" : "-"}${formatMoney(t.amount, currency)}`;
  return (
    // wrap: a huge amount drops the actions to a second line instead of pushing them off-screen
    <li className="flex min-h-[56px] flex-wrap items-center gap-x-3 gap-y-2 border-b-2 border-border px-4 py-2 last:border-b-0">
      <span
        aria-hidden
        className="size-2 shrink-0 rounded-pill border border-border"
        style={{ backgroundColor: `var(--${category?.color ?? "blue"}-400)` }}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1 text-base font-semibold">
          {income ? (
            <ArrowDownLeft aria-hidden className="size-4 shrink-0 text-income" />
          ) : (
            <ArrowUpRight aria-hidden className="size-4 shrink-0 text-expense" />
          )}
          <span className="truncate" title={category?.name ?? "Unknown category"}>
            {category?.name ?? "Unknown category"}
          </span>
        </div>
        {t.note ? (
          <p className="truncate text-sm text-muted-foreground" title={t.note}>
            {t.note}
          </p>
        ) : null}
      </div>
      <span className="tnum shrink-0 text-base font-semibold">{amount}</span>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={() => onEdit(t)}
          aria-label={`Edit transaction ${amount} ${t.date}`}
          className="flex size-11 shrink-0 items-center justify-center border-2 border-border bg-card shadow-hard active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
        >
          <Pencil aria-hidden className="size-5" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(t)}
          aria-label={`Delete transaction ${amount} ${t.date}`}
          className="flex size-11 shrink-0 items-center justify-center border-2 border-border bg-card shadow-hard active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
        >
          <Trash2 aria-hidden className="size-5" />
        </button>
      </div>
    </li>
  );
}
