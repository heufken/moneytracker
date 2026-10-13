import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { Dialog } from "../../components/ui/dialog";
import { listWallets, walletBalance } from "../../db/api";
import type { Wallet } from "../../db/types";
import { formatMoney } from "../../lib/money";
import { balanceShares } from "../../lib/totals";

type Row = { wallet: Wallet; balance: number };

/** Overview hero: money across all wallets (all-time, not month-scoped). Tap for the per-wallet split. */
export function WalletTotalCard({ currency }: { currency: string }) {
  const [rows, setRows] = useState<Row[] | null>(null); // null = loading
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listWallets()
      .then((ws) => Promise.all(ws.map(async (wallet) => ({ wallet, balance: await walletBalance(wallet.id) }))))
      .then((r) => {
        if (!cancelled) setRows(r.sort((a, b) => b.balance - a.balance));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // While loading, render the card shell at its final size so the page below doesn't jump.
  if (rows?.length === 0) {
    return (
      <Link
        to="/settings"
        className="flex min-h-11 items-center justify-between border-3 border-dashed border-border bg-card p-5 font-semibold"
      >
        Add your wallets to see how much you have in total
        <ChevronRight aria-hidden className="size-6 shrink-0" />
      </Link>
    );
  }

  const list = rows ?? [];
  const total = list.reduce((sum, r) => sum + r.balance, 0);
  const shares = balanceShares(list.map((r) => r.balance));

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={!rows}
        aria-haspopup="dialog"
        className="@container w-full border-3 border-border bg-primary p-5 text-left text-primary-foreground shadow-hard-lg active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
      >
        <p className="text-xs font-semibold uppercase tracking-widest">Total across wallets</p>
        <p className="tnum font-display font-bold [overflow-wrap:anywhere] [font-size:clamp(1.75rem,8vw,3rem)] md:[font-size:clamp(1.75rem,6cqw,3rem)]">
          {rows ? formatMoney(total, currency) : "—"}
        </p>
        <p className="mt-1 flex items-center text-sm font-semibold">
          {rows ? `${list.length} wallet${list.length === 1 ? "" : "s"} · tap for breakdown` : "Loading…"}
          <ChevronRight aria-hidden className="size-4" />
        </p>
      </button>

      <Dialog open={open} title="Where your money is" onClose={() => setOpen(false)}>
        <ul className="space-y-4">
          {list.map(({ wallet, balance }, i) => (
            <li key={wallet.id}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate font-semibold" title={wallet.name}>
                  {wallet.name}
                </span>
                <span className="tnum shrink-0 font-semibold">{formatMoney(balance, currency)}</span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <div className="h-3 flex-1 border-2 border-border bg-muted">
                  <div className="h-full bg-primary" style={{ width: `${shares[i]! * 100}%` }} />
                </div>
                <span className="tnum w-10 shrink-0 text-right text-sm text-muted-foreground">
                  {Math.round(shares[i]! * 100)}%
                </span>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex items-baseline justify-between gap-3 border-t-2 border-border pt-3 font-bold">
          <span>Total</span>
          <span className="tnum">{formatMoney(total, currency)}</span>
        </div>
        <Link to="/settings" className="mt-3 flex min-h-11 items-center text-sm font-semibold underline">
          Manage wallets
        </Link>
      </Dialog>
    </>
  );
}