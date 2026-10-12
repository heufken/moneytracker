import { useState } from "react";
import { Banknote, CreditCard, Plus, Smartphone, Wallet2 } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Dialog } from "../../components/ui/dialog";
import { cn } from "../../lib/utils";
import { parseMoney } from "../../lib/money";
import { newId, saveWallet } from "../../db/api";
import type { Wallet } from "../../db/types";

/** First-run suggestions: money usually sits in these. */
const SUGGESTIONS = [
  { name: "Cash", icon: Banknote },
  { name: "Bank", icon: CreditCard },
  { name: "E-wallet", icon: Smartphone },
  { name: "Crypto", icon: Wallet2 },
];

/** Parse an optional balance input; throws with wallet name on garbage. */
function parseBalance(input: string, name: string): number {
  if (!input.trim()) return 0;
  try {
    return parseMoney(input);
  } catch {
    throw new Error(`Invalid amount for ${name}.`);
  }
}

interface WalletOnboardingProps {
  open: boolean;
  onDone: () => void;
}

/**
 * Shown once on first run (no transactions, no wallets): pick starting
 * wallets with opening balances. Skipping just closes — wallets stay
 * manageable in Settings.
 */
export function WalletOnboarding({ open, onDone }: WalletOnboardingProps) {
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [customName, setCustomName] = useState("");
  const [customBalance, setCustomBalance] = useState("");
  const [error, setError] = useState<string | null>(null);

  const toggle = (name: string) =>
    setPicked((p) => {
      const next = { ...p };
      if (name in next) delete next[name];
      else next[name] = "";
      return next;
    });

  const balanceInput = (name: string) => (
    <input
      inputMode="numeric"
      autoComplete="off"
      value={picked[name] ?? ""}
      onChange={(e) => setPicked((p) => ({ ...p, [name]: e.target.value }))}
      aria-label={`${name} opening balance (optional)`}
      placeholder="0"
      className="tnum h-11 w-28 rounded-none border-2 border-border bg-card px-2 text-right text-base font-semibold shadow-hard-sm focus:outline-3 focus:outline-ring focus:outline-offset-2"
    />
  );

  async function handleDone() {
    try {
      const wallets: Wallet[] = Object.entries(picked).map(([name, balance]) => ({
        id: newId("wal"),
        name,
        initialBalance: parseBalance(balance, name),
      }));
      if (customName.trim()) {
        wallets.push({
          id: newId("wal"),
          name: customName.trim(),
          initialBalance: parseBalance(customBalance, customName),
        });
      }
      if (wallets.length > 0) await Promise.all(wallets.map(saveWallet));
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid input.");
    }
  }

  return (
    <Dialog open={open} title="Where is your money?" onClose={() => void handleDone()}>
      <div className="space-y-4">
        <p className="text-base">
          Track balances across cash, bank apps, e-wallets, crypto. Pick the ones you use — you
          can add more anytime in Settings.
        </p>

        <ul className="space-y-2">
          {SUGGESTIONS.map(({ name, icon: Icon }) => {
            const on = name in picked;
            return (
              <li
                key={name}
                className={cn(
                  "flex min-h-[56px] items-center gap-3 border-2 border-border px-4",
                  on ? "bg-primary/10" : "bg-card",
                )}
              >
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(name)}
                  className="flex min-h-[44px] flex-1 items-center gap-3 text-left font-bold"
                >
                  <Icon aria-hidden className="size-5 shrink-0" />
                  {name}
                </button>
                {on && balanceInput(name)}
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-2">
          <Plus aria-hidden className="size-5 shrink-0 text-muted-foreground" />
          <input
            type="text"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            aria-label="Custom wallet name"
            placeholder="Add another (e.g. GoPay)"
            className="h-11 min-w-0 flex-1 rounded-none border-2 border-border bg-card px-3 text-base shadow-hard-sm focus:outline-3 focus:outline-ring focus:outline-offset-2"
          />
          <input
            inputMode="numeric"
            autoComplete="off"
            value={customBalance}
            onChange={(e) => setCustomBalance(e.target.value)}
            aria-label="Custom wallet opening balance (optional)"
            placeholder="0"
            className="tnum h-11 w-24 rounded-none border-2 border-border bg-card px-2 text-right text-base font-semibold shadow-hard-sm focus:outline-3 focus:outline-ring focus:outline-offset-2"
          />
        </div>

        {error && (
          <p role="alert" className="text-sm font-semibold">
            {error}
          </p>
        )}

        <div className="flex gap-2 pt-2">
          <Button className="flex-1" onClick={() => void handleDone()}>
            {Object.keys(picked).length > 0 || customName.trim() ? "Save wallets" : "Start"}
          </Button>
          <Button variant="secondary" onClick={onDone}>
            Skip
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
