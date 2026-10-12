import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { CategoriesManager } from "../categories/CategoriesManager";
import { getSetting, setSetting } from "../../db/api";
import { BackupSection } from "../backup/BackupSection";
import { cn } from "../../lib/utils";

const CURRENCIES = ["IDR", "USD", "EUR", "SGD", "JPY"];

export function SettingsPage() {
  const [currency, setCurrency] = useState("IDR");
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));

  useEffect(() => {
    let cancelled = false;
    getSetting("currency").then((v) => {
      if (!cancelled && v) setCurrency(v);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function changeCurrency(next: string) {
    setCurrency(next);
    void setSetting("currency", next);
  }

  function toggleDark() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
  }

  return (
    <div className="space-y-8">
      <h1 className="font-display text-2xl font-bold">Settings</h1>

      <section aria-label="Currency" className="space-y-2">
        <h2 className="font-display text-xl font-bold">Currency</h2>
        <label htmlFor="currency" className="block text-xs font-semibold uppercase tracking-widest">
          Display currency
        </label>
        <select
          id="currency"
          value={currency}
          onChange={(e) => changeCurrency(e.target.value)}
          className="h-11 w-full max-w-56 rounded-none border-2 border-border bg-card px-3 text-base shadow-hard-sm focus:outline-3 focus:outline-ring focus:outline-offset-2"
        >
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <p className="text-sm text-muted-foreground">Amounts stay stored as integers.</p>
      </section>

      <section aria-label="Appearance" className="space-y-2">
        <h2 className="font-display text-xl font-bold">Appearance</h2>
        <button
          type="button"
          onClick={toggleDark}
          aria-pressed={dark}
          className={cn(
            "flex h-11 items-center gap-2 rounded-sm border-2 border-border px-4 font-bold",
            dark ? "bg-card" : "bg-card",
          )}
        >
          {dark ? <Moon aria-hidden className="size-5" /> : <Sun aria-hidden className="size-5" />}
          {dark ? "Dark mode" : "Light mode"}
        </button>
      </section>
      <CategoriesManager />
      <BackupSection />
    </div>
  );
}
