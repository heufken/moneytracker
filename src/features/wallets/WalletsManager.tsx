import { useEffect, useState, type SyntheticEvent } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Dialog } from "../../components/ui/dialog";
import { formatMoney, parseMoney } from "../../lib/money";
import {
  countTransactionsByWallet,
  deleteWallet,
  getSetting,
  listWallets,
  newId,
  saveWallet,
  walletBalance,
} from "../../db/api";
import type { Wallet } from "../../db/types";

/** Common places money sits. Short on purpose: anything else goes through "Custom…". */
const PRESETS = [
  { group: "Banks", names: ["BCA", "Mandiri", "BNI", "BRI", "Jago"] },
  { group: "E-wallets", names: ["GoPay", "OVO", "DANA", "ShopeePay"] },
];
const CUSTOM = "__custom";

export function WalletsManager() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [editing, setEditing] = useState<Wallet | null>(null);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<Wallet | null>(null);
  const [deletingCount, setDeletingCount] = useState<number | null>(null);
  const [currency, setCurrency] = useState("IDR");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const rows = await listWallets();
      if (cancelled) return;
      setWallets(rows);
      setBalances(
        Object.fromEntries(await Promise.all(rows.map(async (w) => [w.id, await walletBalance(w.id)]))),
      );
      const cur = await getSetting("currency");
      if (!cancelled && cur) setCurrency(cur);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function refresh() {
    const rows = await listWallets();
    setWallets(rows);
    setBalances(
      Object.fromEntries(await Promise.all(rows.map(async (w) => [w.id, await walletBalance(w.id)]))),
    );
  }

  async function askDelete(wallet: Wallet) {
    setDeletingCount(await countTransactionsByWallet(wallet.id));
    setDeleting(wallet);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">Wallets</h2>
        <Button onClick={() => setAdding(true)}>
          <Plus aria-hidden />
          Add
        </Button>
      </div>

      {wallets.length > 0 && (
        <ul className="border-2 border-border bg-card shadow-hard-md">
          {wallets.map((w) => (
            <li
              key={w.id}
              className="flex min-h-[56px] items-center gap-3 border-b-2 border-border px-4 py-2 last:border-b-0"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold" title={w.name}>{w.name}</p>
                <p className="tnum text-sm text-muted-foreground">{formatMoney(balances[w.id] ?? 0, currency)}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditing(w)}
                aria-label={`Edit wallet ${w.name}`}
                className="flex size-11 shrink-0 items-center justify-center border-2 border-border bg-card shadow-hard active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
              >
                <Pencil aria-hidden className="size-5" />
              </button>
              <button
                type="button"
                onClick={() => void askDelete(w)}
                aria-label={`Delete wallet ${w.name}`}
                className="flex size-11 shrink-0 items-center justify-center border-2 border-border bg-card shadow-hard active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
              >
                <Trash2 aria-hidden className="size-5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <WalletDialog
        // length in the key: remount (fresh form) after each add, otherwise the last name sticks
        key={editing?.id ?? `new-${wallets.length}`}
        open={adding || editing !== null}
        wallet={editing}
        existingNames={wallets.map((w) => w.name.toLowerCase())}
        onClose={() => {
          setAdding(false);
          setEditing(null);
        }}
        onSaved={() => {
          setAdding(false);
          setEditing(null);
          void refresh();
        }}
      />

      {/* delete confirm: count-aware, force path explicit */}
      <Dialog
        open={deleting !== null}
        title={`Delete ${deleting?.name ?? ""}`}
        destructive
        onClose={() => {
          setDeleting(null);
          setDeletingCount(null);
        }}
      >
        <p className="mb-4 text-base">
          {deletingCount === 0
            ? "Are you sure? This cannot be undone."
            : `${deleting?.name} has ${deletingCount} transaction(s). Deleting keeps those transactions but removes their wallet tag. This cannot be undone.`}
        </p>
        <div className="flex gap-2">
          <Button
            variant="destructive"
            className="flex-1"
            onClick={async () => {
              if (deleting) await deleteWallet(deleting.id, { force: true });
              setDeleting(null);
              setDeletingCount(null);
              void refresh();
            }}
          >
            Delete wallet
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setDeleting(null);
              setDeletingCount(null);
            }}
          >
            Cancel
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

interface WalletDialogProps {
  open: boolean;
  wallet?: Wallet | null;
  /** Lowercased names already in use; hidden from the preset list. */
  existingNames: string[];
  onClose: () => void;
  onSaved: () => void;
}

function WalletDialog({ open, wallet, existingNames, onClose, onSaved }: WalletDialogProps) {
  const [name, setName] = useState(wallet?.name ?? "");
  const [custom, setCustom] = useState(false);
  const free = (names: string[]) => names.filter((n) => !existingNames.includes(n.toLowerCase()));
  // Plain integer prefill: parseMoney rejects the "-Rp 250.000" formatMoney shape
  const [balance, setBalance] = useState(wallet ? String(wallet.initialBalance) : "");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: SyntheticEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    let initialBalance = 0;
    if (balance.trim()) {
      try {
        initialBalance = parseMoney(balance);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Invalid amount.");
        return;
      }
    }
    await saveWallet({
      id: wallet?.id ?? newId("wal"),
      name: name.trim(),
      initialBalance,
    });
    onSaved();
  }

  return (
    <Dialog open={open} title={wallet ? "Edit wallet" : "Add wallet"} onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div>
          <label htmlFor="wallet-name" className="mb-1 block text-xs font-semibold uppercase tracking-widest">
            Name
          </label>
          {/* adding: pick from presets (or Custom…); editing: plain rename */}
          {!wallet && (
            <select
              id="wallet-name"
              value={custom ? CUSTOM : name}
              onChange={(e) => {
                const v = e.target.value;
                setCustom(v === CUSTOM);
                setName(v === CUSTOM ? "" : v);
              }}
              className="h-11 w-full rounded-none border-2 border-border bg-card px-3 text-base shadow-hard-sm focus:outline-3 focus:outline-ring focus:outline-offset-2"
            >
              <option value="">Choose…</option>
              {free(["Cash"]).map((n) => (
                <option key={n}>{n}</option>
              ))}
              {PRESETS.map(({ group, names }) =>
                free(names).length > 0 ? (
                  <optgroup key={group} label={group}>
                    {free(names).map((n) => (
                      <option key={n}>{n}</option>
                    ))}
                  </optgroup>
                ) : null,
              )}
              <option value={CUSTOM}>Custom…</option>
            </select>
          )}
          {(wallet || custom) && (
            <input
              id={wallet ? "wallet-name" : undefined}
              aria-label="Wallet name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`h-11 w-full rounded-none border-2 border-border bg-card px-3 text-base shadow-hard-sm focus:outline-3 focus:outline-ring focus:outline-offset-2${wallet ? "" : " mt-2"}`}
              placeholder="e.g. Permata, Neo Commerce"
            />
          )}
        </div>
        <div>
          <label htmlFor="wallet-balance" className="mb-1 block text-xs font-semibold uppercase tracking-widest">
            Opening balance
          </label>
          <input
            id="wallet-balance"
            inputMode="numeric"
            autoComplete="off"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            className="tnum h-11 w-full rounded-none border-2 border-border bg-card px-3 text-right text-base font-semibold shadow-hard-sm focus:outline-3 focus:outline-ring focus:outline-offset-2"
            placeholder="0"
          />
          <p className="mt-1 text-sm text-muted-foreground">
            Money already in this wallet when you started tracking. Current balance = opening + income − expense.
          </p>
        </div>
        {error && (
          <p role="alert" className="text-sm font-semibold">
            {error}
          </p>
        )}
        <div className="flex gap-2 pt-2">
          <Button type="submit" className="flex-1">
            Save
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
