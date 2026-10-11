import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { listCategories, listTransactions, getSetting } from "../../db/api";
import type { Category, Transaction } from "../../db/types";
import { monthRange, todayISO } from "../../lib/dates";
import { formatMoney } from "../../lib/money";
import { monthTotals, monthlyFlow, spendingByCategory } from "../../lib/totals";
import { cn } from "../../lib/utils";
import { useTouchDevice } from "../../lib/use-touch-device";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function OverviewPage() {
  const [month, setMonth] = useState(() => todayISO().slice(0, 7));
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const isTouch = useTouchDevice();
  const [categories, setCategories] = useState<Category[]>([]);
  const [currency, setCurrency] = useState("IDR");

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

  useEffect(() => {
    let cancelled = false;
    const { from, to } = monthRange(`${month}-01`);
    listTransactions({ from, to }).then((rows) => {
      if (!cancelled) setTransactions(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [month]);

  const totals = useMemo(() => monthTotals(transactions), [transactions]);
  const spend = useMemo(() => spendingByCategory(transactions, categories), [transactions, categories]);

  const [y, m] = useMemo(() => month.split("-").map(Number), [month]);

  function shiftMonth(delta: number) {
    const d = new Date(y!, m! - 1 + delta, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const label = `${MONTHS[m! - 1]} ${y}`;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Overview</h1>

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

      {/* summary cards: stacked mobile, 3-col ≥768px; net flips color by sign */}
      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Income" amount={totals.income} tone="income" />
        <SummaryCard label="Expense" amount={totals.expense} tone="expense" />
        <SummaryCard label="Net" amount={totals.net} tone={totals.net >= 0 ? "income" : "expense"} />
      </div>

      {/* spending by category */}
      <section aria-label="Spending by category" className="border-2 border-border bg-card p-4 shadow-hard-md">
        <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-widest">Spending by category</h2>
        {spend.length === 0 ? (
          <p className="text-base text-muted-foreground">No expenses this month.</p>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(spend.length * 44, 120)}>
            <BarChart data={spend} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
              <CartesianGrid horizontal={false} strokeDasharray="4 4" stroke="var(--color-muted-foreground)" strokeOpacity={0.4} />
              <XAxis type="number" tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }} tickFormatter={(v: number) => formatMoney(v, currency)} />
              <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 12, fill: "var(--color-foreground)" }} />
              <Tooltip
                trigger={isTouch ? "click" : "hover"}
                formatter={(v) => [formatMoney(Number(v), currency), "Spent"]}
                contentStyle={{
                  background: "var(--color-card)",
                  border: "2px solid var(--color-border)",
                  borderRadius: 0,
                  boxShadow: "5px 5px 0 0 var(--color-shadow)",
                  color: "var(--color-foreground)",
                }}
              />
              <Bar dataKey="total" radius={0} stroke="var(--color-border)" strokeWidth={2}>
                {spend.map((s) => (
                  <Bar key={s.categoryId} dataKey="total" fill={`var(--${s.color}-400)`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </section>

      {/* 6-month income vs expense */}
      <SixMonthChart month={month} currency={currency} isTouch={isTouch} />
    </div>
  );
}

function SummaryCard({ label, amount, tone }: { label: string; amount: number; tone: "income" | "expense" }) {
  return (
    <div
      className={cn("border-3 border-border p-5 shadow-hard-lg", tone === "income" ? "bg-income" : "bg-expense")}
    >
      <p className="text-xs font-semibold uppercase tracking-widest">{label}</p>
      <p className="tnum font-display text-3xl font-bold" style={{ fontSize: "clamp(1.5rem, 6vw, 2.5rem)" }}>
        {formatMoney(amount)}
      </p>
    </div>
  );
}

function SixMonthChart({ month, currency, isTouch }: { month: string; currency: string; isTouch: boolean }) {
  const [flow, setFlow] = useState<{ month: string; income: number; expense: number }[]>([]);

  useEffect(() => {
    let cancelled = false;
    // fetch 6-month window of raw transactions
    const [ey, em] = month.split("-").map(Number);
    const start = new Date(ey!, em! - 6, 1);
    const from = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-01`;
    const { to } = monthRange(`${month}-01`);
    listTransactions({ from, to }).then((rows) => {
      if (cancelled) return;
      const monthly = monthlyFlow(rows, month, 6).map((f) => ({
        ...f,
        label: MONTHS_SHORT[Number(f.month.slice(5, 7)) - 1],
      }));
      setFlow(monthly);
    });
    return () => {
      cancelled = true;
    };
  }, [month]);

  return (
    <section aria-label="Income vs expense, last 6 months" className="border-2 border-border bg-card p-4 shadow-hard-md">
      <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-widest">Last 6 months</h2>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={flow} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
          <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="var(--color-muted-foreground)" strokeOpacity={0.4} />
          <XAxis dataKey="label" tick={{ fontSize: 12, fill: "var(--color-foreground)" }} />
          <YAxis
            tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
            tickFormatter={(v: number) => (v >= 1000000 ? `${v / 1000000}M` : v >= 1000 ? `${v / 1000}k` : String(v))}
            width={44}
          />
          <Tooltip
            trigger={isTouch ? "click" : "hover"}
            cursor={{ fill: "var(--color-muted)", opacity: 0.5 }}
            formatter={(v, name) => [formatMoney(Number(v), currency), String(name)]}
            contentStyle={{
              background: "var(--color-card)",
              border: "2px solid var(--color-border)",
              borderRadius: 0,
              boxShadow: "5px 5px 0 0 var(--color-shadow)",
              color: "var(--color-foreground)",
            }}
          />
          <Legend formatter={(v) => String(v)} wrapperStyle={{ fontSize: 12, textTransform: "capitalize" }} />
          <Bar dataKey="income" name="Income" fill="var(--color-income)" radius={0} stroke="var(--color-border)" strokeWidth={2} />
          <Bar dataKey="expense" name="Expense" fill="var(--color-expense)" radius={0} stroke="var(--color-border)" strokeWidth={2} />
        </BarChart>
      </ResponsiveContainer>
    </section>
  );
}
