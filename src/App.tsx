import { useEffect, useState } from "react";
import { HashRouter, Route, Routes, Outlet, useLocation } from "react-router-dom";
import { BottomNav } from "./components/layout/BottomNav";
import { TransactionsPage } from "./features/transactions/TransactionsPage";
import { SettingsPage } from "./features/settings/SettingsPage";
import { OverviewPage } from "./features/overview/OverviewPage";
import { WalletOnboarding } from "./features/wallets/WalletOnboarding";
import { SYNCED_EVENT } from "./features/sync/sync";
import { getSetting, listTransactions, listWallets, setSetting } from "./db/api";
import { cn } from "./lib/utils";

function Layout() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardedTick, setOnboardedTick] = useState(0);
  const [syncTick, setSyncTick] = useState(0);
  const wide = useLocation().pathname === "/"; // Overview has charts + cards that use the room

  useEffect(() => {
    // First run = no transactions, no wallets (categories are seeded), and
    // onboarding was never shown/skipped. Flag stops repeat dialogs for
    // deliberate skippers even while the db stays empty.
    let cancelled = false;
    Promise.all([listTransactions(), listWallets(), getSetting("walletsOnboarded")]).then(
      ([txns, wallets, onboarded]) => {
        if (!cancelled)
          setShowOnboarding(txns.length === 0 && wallets.length === 0 && onboarded !== "1");
      },
    );
    return () => {
      cancelled = true;
    };
  }, [syncTick]); // a pull can fill an empty db: re-decide whether onboarding is still needed

  useEffect(() => {
    // Sync pulled new data: remount the page (same trick as onboarding) so it re-reads the db.
    const bump = () => setSyncTick((n) => n + 1);
    window.addEventListener(SYNCED_EVENT, bump);
    return () => window.removeEventListener(SYNCED_EVENT, bump);
  }, []);

  return (
    <div className={cn("mx-auto min-h-dvh max-w-lg px-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pb-[calc(6rem+env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]", wide && "md:max-w-5xl")}>
      <Outlet key={`${onboardedTick}-${syncTick}`} />
      <BottomNav />
      <WalletOnboarding
        open={showOnboarding}
        onDone={() => {
          void setSetting("walletsOnboarded", "1");
          setShowOnboarding(false);
          setOnboardedTick((n) => n + 1); // remount the page so Overview sees the just-created wallets
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<OverviewPage />} />
          <Route path="transactions" element={<TransactionsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}