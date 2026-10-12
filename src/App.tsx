import { HashRouter, Route, Routes, Outlet } from "react-router-dom";
import { BottomNav } from "./components/layout/BottomNav";
import { TransactionsPage } from "./features/transactions/TransactionsPage";
import { SettingsPage } from "./features/settings/SettingsPage";
import { OverviewPage } from "./features/overview/OverviewPage";

function Layout() {
  return (
    <div className="mx-auto min-h-dvh max-w-lg px-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pb-[calc(6rem+env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]">
      <Outlet />
      <BottomNav />
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
