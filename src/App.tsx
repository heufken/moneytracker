import { HashRouter, Route, Routes, Outlet } from "react-router-dom";
import { BottomNav } from "./components/layout/BottomNav";
import { TransactionsPage } from "./features/transactions/TransactionsPage";
import { SettingsPage } from "./features/settings/SettingsPage";

function Layout() {
  return (
    <div className="mx-auto min-h-screen max-w-lg px-4 pb-24 pt-6">
      <Outlet />
      <BottomNav />
    </div>
  );
}

function OverviewPage() {
  return <h1 className="font-display text-2xl font-bold">Overview</h1>;
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
