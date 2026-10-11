import { NavLink } from "react-router-dom";
import { PiggyBank, ArrowLeftRight, Settings } from "lucide-react";
import { cn } from "../../lib/utils";

const tabs = [
  { to: "/", label: "Overview", icon: PiggyBank, end: true },
  { to: "/transactions", label: "Transactions", icon: ArrowLeftRight, end: false },
  { to: "/settings", label: "Settings", icon: Settings, end: false },
];

export function BottomNav() {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-border bg-card"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-lg">
        {tabs.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 px-2 py-2",
                "rounded-pill border-2 transition-colors duration-[140ms]",
                isActive
                  ? "mx-2 my-1 bg-primary shadow-hard"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )
            }
          >
            <Icon aria-hidden className="size-6" />
            <span className="text-xs font-semibold uppercase tracking-widest">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
