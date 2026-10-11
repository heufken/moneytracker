import { HashRouter, Route, Routes, Outlet } from "react-router-dom";
import { BottomNav } from "./components/layout/BottomNav";
import { TransactionsPage } from "./features/transactions/TransactionsPage";
import { SettingsPage } from "./features/settings/SettingsPage";
import { OverviewPage } from "./features/overview/OverviewPage";

function Layout() {
  return (
    <div className="mx-auto min-h-screen max-w-lg px-4 pb-24 pt-6">
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
