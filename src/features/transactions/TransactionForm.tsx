import { useEffect, useState, type SyntheticEvent } from "react";
import { Button } from "../../components/ui/button";
import { formatMoney, parseMoney } from "../../lib/money";
import { todayISO } from "../../lib/dates";
import { cn } from "../../lib/utils";
import { listCategories, addTransaction, updateTransaction, getSetting } from "../../db/api";
import type { Category, Transaction } from "../../db/types";
import { transactionFormSchema, type TransactionFormValues } from "./schema";

interface Props {
  /** Existing transaction → edit mode. */
  transaction?: Transaction;
  /** Last-used category per type, preselects the matching type's category. */
  initialCategoryId?: string;
  onDone: () => void;
  onCancel: () => void;
}

const EMPTY: TransactionFormValues = {
  type: "expense",
  amount: "",
  categoryId: "",
  date: todayISO(),
  note: "",
};

export function TransactionForm({ transaction, initialCategoryId, onDone, onCancel }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [currency, setCurrency] = useState("IDR");
  const [values, setValues] = useState<TransactionFormValues>(() =>
    transaction
      ? {
          type: transaction.type,
          // display prefill grouped like the app formats it
          amount: formatMoney(transaction.amount).replace(/^[A-Za-z]+\s/, ""),
          categoryId: transaction.categoryId,
          date: transaction.date,
          note: transaction.note ?? "",
        }
      : { ...EMPTY, categoryId: initialCategoryId ?? "" },
  );
  const [errors, setErrors] = useState<Partial<Record<keyof TransactionFormValues, string>>>({});

  useEffect(() => {
    let cancelled = false;
    listCategories().then((rows) => {
      if (!cancelled) setCategories(rows);
    });
    getSetting("currency").then((v) => {
      if (!cancelled && v) setCurrency(v);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleCategories = categories.filter((c) => c.type === values.type);

  function set<K extends keyof TransactionFormValues>(key: K, value: TransactionFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }
  async function handleSubmit(e: SyntheticEvent) {
    e.preventDefault();
    const parsed = transactionFormSchema.safeParse(values);
    if (!parsed.success) {
      const fieldErrors: typeof errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof TransactionFormValues;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    const amount = parseMoney(parsed.data.amount);
    if (transaction) {
      await updateTransaction(transaction.id, {
        type: parsed.data.type,
        amount,
        categoryId: parsed.data.categoryId,
        date: parsed.data.date,
        note: parsed.data.note?.trim() || undefined,
      });
    } else {
      await addTransaction({
        type: parsed.data.type,
        amount,
        categoryId: parsed.data.categoryId,
        date: parsed.data.date,
        note: parsed.data.note?.trim() || undefined,
      });
    }
    onDone();
  }

  const err = (k: keyof TransactionFormValues) =>
    errors[k] ? (
      <p role="alert" className="text-sm font-semibold">
        {errors[k]}
      </p>
    ) : null;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {/* type toggle */}
      <fieldset>
        <legend className="mb-1 text-xs font-semibold uppercase tracking-widest">Type</legend>
        <div className="grid grid-cols-2 gap-2">
          {(["expense", "income"] as const).map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={values.type === t}
              onClick={() => {
                set("type", t);
                // reset category when switching type: category lists differ
                const first = categories.find((c) => c.type === t);
                setValues((v) => ({ ...v, type: t, categoryId: first?.id ?? "" }));
              }}
              className={cn(
                "h-11 rounded-sm border-2 border-border font-bold capitalize transition-colors duration-[140ms]",
                values.type === t
                  ? t === "income"
                    ? "bg-income text-income-foreground shadow-hard"
                    : "bg-expense text-expense-foreground shadow-hard"
                  : "bg-card text-muted-foreground",
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </fieldset>

      {/* amount */}
      <div>
        <label htmlFor="amount" className="mb-1 block text-xs font-semibold uppercase tracking-widest">
          Amount
        </label>
        <div className="flex items-center gap-2">
          <input
            id="amount"
            inputMode="numeric"
            autoComplete="off"
            value={values.amount}
            onChange={(e) => set("amount", e.target.value)}
            aria-describedby={errors.amount ? "amount-error" : undefined}
            className="tnum h-11 w-full rounded-none border-2 border-border bg-card px-3 text-base font-semibold shadow-hard-sm focus:outline-3 focus:outline-ring focus:outline-offset-2"
            placeholder="0"
          />
          <span className="text-sm font-semibold" aria-hidden>
            {currency}
          </span>
        </div>
        {values.amount && !errors.amount ? (
          <p className="mt-1 text-sm text-muted-foreground tnum" aria-live="polite">
            {formatMoney(parseMoney(values.amount))}
          </p>
        ) : null}
        <div id="amount-error">{err("amount")}</div>
      </div>

      {/* category */}
      <div>
        <label htmlFor="category" className="mb-1 block text-xs font-semibold uppercase tracking-widest">
          Category
        </label>
        <select
          id="category"
          value={values.categoryId}
          onChange={(e) => set("categoryId", e.target.value)}
          aria-describedby={errors.categoryId ? "category-error" : undefined}
          className="h-11 w-full rounded-none border-2 border-border bg-card px-3 text-base shadow-hard-sm focus:outline-3 focus:outline-ring focus:outline-offset-2"
        >
          <option value="">Pick a category</option>
          {visibleCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <div id="category-error">{err("categoryId")}</div>
      </div>

      {/* date */}
      <div>
        <label htmlFor="date" className="mb-1 block text-xs font-semibold uppercase tracking-widest">
          Date
        </label>
        <input
          id="date"
          type="date"
          value={values.date}
          onChange={(e) => set("date", e.target.value)}
          aria-describedby={errors.date ? "date-error" : undefined}
          className="h-11 w-full rounded-none border-2 border-border bg-card px-3 text-base shadow-hard-sm focus:outline-3 focus:outline-ring focus:outline-offset-2"
        />
        <div id="date-error">{err("date")}</div>
      </div>

      {/* note */}
      <div>
        <label htmlFor="note" className="mb-1 block text-xs font-semibold uppercase tracking-widest">
          Note (optional)
        </label>
        <input
          id="note"
          type="text"
          value={values.note}
          onChange={(e) => set("note", e.target.value)}
          aria-describedby={errors.note ? "note-error" : undefined}
          className="h-11 w-full rounded-none border-2 border-border bg-card px-3 text-base shadow-hard-sm focus:outline-3 focus:outline-ring focus:outline-offset-2"
          placeholder="e.g. lunch with friends"
        />
        <div id="note-error">{err("note")}</div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" className="flex-1">
          {transaction ? "Save changes" : "Add transaction"}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
