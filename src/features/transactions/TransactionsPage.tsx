import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Dialog } from "../../components/ui/dialog";
import { ConfirmDeleteDialog } from "../../components/ui/confirm-delete";
import { TransactionForm } from "./TransactionForm";
import { TransactionList } from "./TransactionList";
import { listCategories, listTransactions, deleteTransaction, getSetting } from "../../db/api";
import type { Category, Transaction, TransactionType } from "../../db/types";
import { monthRange, todayISO } from "../../lib/dates";
import { cn } from "../../lib/utils";

type TypeFilter = "all" | TransactionType;

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function TransactionsPage() {
  const [month, setMonth] = useState(() => todayISO().slice(0, 7)); // YYYY-MM
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currency, setCurrency] = useState("IDR");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);

  useEffect(() => {
    listCategories().then(setCategories);
    getSetting("currency").then((v) => {
      if (v) setCurrency(v);
    });
  }, []);

  // IndexedDB is the external system; reload when filters change.
  useEffect(() => {
    let cancelled = false;
    const { from, to } = monthRange(`${month}-01`);
    listTransactions({
      from,
      to,
      type: typeFilter === "all" ? undefined : typeFilter,
      categoryId: categoryFilter === "all" ? undefined : categoryFilter,
    }).then((rows) => {
      if (!cancelled) setTransactions(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [month, typeFilter, categoryFilter]);

  async function refresh() {
    const { from, to } = monthRange(`${month}-01`);
    setTransactions(
      await listTransactions({
        from,
        to,
        type: typeFilter === "all" ? undefined : typeFilter,
        categoryId: categoryFilter === "all" ? undefined : categoryFilter,
      }),
    );
  }

  const [y, m] = useMemo(() => month.split("-").map(Number), [month]);
  const label = `${MONTHS[m! - 1]} ${y}`;

  function shiftMonth(delta: number) {
    const d = new Date(y!, m! - 1 + delta, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const visibleCategories =
    typeFilter === "all" ? categories : categories.filter((c) => c.type === typeFilter);

   // Last-used category = most recent transaction's (list is newest-first).
   const lastCategoryId = transactions[0]?.categoryId;
  // Same for wallet.
  const lastWalletId = transactions[0]?.walletId;

  return (
    <div className="page-fade space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Transactions</h1>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus aria-hidden />
          Add
        </Button>
      </div>

      {/* month picker */}
      <div className="flex items-center justify-between border-2 border-border bg-card px-2 py-1 shadow-hard">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          aria-label="Previous month"
          className="flex size-11 items-center justify-center border-2 border-border bg-card shadow-hard active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
        >
          <ChevronLeft aria-hidden className="size-6" />
        </button>
        <span aria-live="polite" className="font-display text-base font-bold uppercase tracking-wide">
          {label}
        </span>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          aria-label="Next month"
          className="flex size-11 items-center justify-center border-2 border-border bg-card shadow-hard active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
        >
          <ChevronRight aria-hidden className="size-6" />
        </button>
      </div>

      {/* type chips */}
      <div className="flex flex-wrap gap-2 pb-1">
        {(["all", "income", "expense"] as const).map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={typeFilter === t}
            onClick={() => {
              setTypeFilter(t);
              setCategoryFilter("all");
            }}
            className={cn(
              "min-h-[36px] shrink-0 rounded-pill border-2 border-border px-4 text-xs font-semibold uppercase tracking-widest transition-colors duration-[140ms]",
              typeFilter === t ? "bg-primary text-primary-foreground shadow-hard" : "bg-card text-muted-foreground",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* category chips */}
      <div className="flex flex-wrap gap-2 pb-1">
        <button
          type="button"
          aria-pressed={categoryFilter === "all"}
          onClick={() => setCategoryFilter("all")}
          className={cn(
            "min-h-[36px] shrink-0 rounded-pill border-2 border-border px-4 text-xs font-semibold uppercase tracking-widest transition-colors duration-[140ms]",
            categoryFilter === "all" ? "bg-primary text-primary-foreground shadow-hard" : "bg-card text-muted-foreground",
          )}
        >
          All categories
        </button>
        {visibleCategories.map((c) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={categoryFilter === c.id}
            onClick={() => setCategoryFilter(c.id)}
            className={cn(
              "flex min-h-[36px] max-w-full shrink-0 items-center gap-2 rounded-pill border-2 border-border px-4 text-xs font-semibold uppercase tracking-widest transition-colors duration-[140ms]",
              categoryFilter === c.id ? "bg-primary text-primary-foreground shadow-hard" : "bg-card text-muted-foreground",
            )}
          >
            <span
              aria-hidden
              className="size-2 shrink-0 rounded-pill border border-border"
              style={{ backgroundColor: `var(--${c.color}-400)` }}
            />
            <span className="truncate" title={c.name}>{c.name}</span>
          </button>
        ))}
      </div>

      <TransactionList
        transactions={transactions}
        currency={currency}
        categories={categories}
        onEdit={(t) => {
          setEditing(t);
          setFormOpen(true);
        }}
        onDelete={(t) => setDeleting(t)}
      />

      <Dialog
        open={formOpen}
        title={editing ? "Edit transaction" : "Add transaction"}
        onClose={() => setFormOpen(false)}
      >
        <TransactionForm
           initialCategoryId={editing ? undefined : lastCategoryId}
          initialWalletId={editing ? undefined : lastWalletId}
          onDone={() => {
            setFormOpen(false);
            void refresh();
          }}
          onCancel={() => setFormOpen(false)}
        />
      </Dialog>

      <ConfirmDeleteDialog
        open={deleting !== null}
        subject="transaction"
        onCancel={() => setDeleting(null)}
        onConfirm={async () => {
          if (deleting) await deleteTransaction(deleting.id);
          setDeleting(null);
          void refresh();
        }}
      />
    </div>
  );
}
