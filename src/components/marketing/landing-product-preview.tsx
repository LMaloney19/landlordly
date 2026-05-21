import {
  AlertTriangle,
  Building2,
  CircleDollarSign,
  DollarSign,
  FileText,
  Hammer,
  Home,
  LayoutDashboard,
  Receipt,
  Users,
  BarChart3,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, active: true },
  { label: "Properties", icon: Building2, active: false },
  { label: "Tenants", icon: Users, active: false },
  { label: "Rent", icon: Receipt, active: false },
  { label: "Expenses", icon: CircleDollarSign, active: false },
  { label: "Maintenance", icon: Hammer, active: false },
  { label: "Documents", icon: FileText, active: false },
  { label: "Reports", icon: BarChart3, active: false },
] as const;

export function LandingProductPreview() {
  return (
    <div
      className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-2xl shadow-zinc-900/10 ring-1 ring-zinc-900/5"
      aria-hidden
    >
      <div className="flex border-b border-zinc-200 bg-zinc-100/80 px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="h-3 w-3 rounded-full bg-zinc-300" />
          <span className="h-3 w-3 rounded-full bg-zinc-300" />
          <span className="h-3 w-3 rounded-full bg-zinc-300" />
        </div>
        <div className="mx-auto flex h-6 max-w-sm flex-1 items-center justify-center rounded-md bg-white px-3 text-[10px] text-zinc-400">
          landlordly.app/dashboard
        </div>
      </div>

      <div className="flex min-h-[420px] bg-zinc-50">
        <aside className="hidden w-44 shrink-0 border-r border-zinc-200 bg-white sm:block">
          <div className="flex h-11 items-center gap-2 border-b border-zinc-200 px-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-900 text-white">
              <Home className="h-3.5 w-3.5" />
            </span>
            <span className="text-xs font-semibold text-zinc-900">Landlordly</span>
          </div>
          <nav className="space-y-0.5 p-2">
            {navItems.map(({ label, icon: Icon, active }) => (
              <div
                key={label}
                className={
                  active
                    ? "flex items-center gap-2 rounded-md bg-zinc-100 px-2 py-1.5 text-xs font-medium text-zinc-900"
                    : "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-zinc-500"
                }
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {label}
              </div>
            ))}
          </nav>
        </aside>

        <div className="min-w-0 flex-1 p-4 sm:p-5">
          <p className="text-sm font-semibold text-zinc-900">Dashboard</p>
          <p className="text-[11px] text-zinc-500">
            Portfolio snapshot — May 2026
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
            {[
              { label: "Properties", value: "4", icon: Building2 },
              { label: "Units", value: "11", icon: Home },
              { label: "Rent collected", value: "$18.2k", icon: DollarSign, accent: true },
              { label: "Open maintenance", value: "2", icon: AlertTriangle, warn: true },
            ].map(({ label, value, icon: Icon, accent, warn }) => (
              <div
                key={label}
                className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm"
              >
                <div className="flex items-start justify-between gap-1">
                  <div>
                    <p className="text-[10px] font-medium text-zinc-500">{label}</p>
                    <p className="mt-1 text-lg font-semibold text-zinc-900">{value}</p>
                  </div>
                  <span
                    className={
                      warn
                        ? "flex h-7 w-7 items-center justify-center rounded-md bg-amber-50 text-amber-600"
                        : accent
                          ? "flex h-7 w-7 items-center justify-center rounded-md bg-emerald-50 text-emerald-600"
                          : "flex h-7 w-7 items-center justify-center rounded-md bg-zinc-100 text-zinc-600"
                    }
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <div className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm">
              <p className="text-xs font-semibold text-zinc-900">Leases expiring soon</p>
              <ul className="mt-2 space-y-2">
                {[
                  { name: "Jamie Rivera", unit: "Unit 2B", days: 24, tone: "red" },
                  { name: "Alex Chen", unit: "Apt 4", days: 52, tone: "amber" },
                ].map(({ name, unit, days, tone }) => (
                  <li
                    key={name}
                    className="flex items-center justify-between gap-2 text-[11px]"
                  >
                    <span className="font-medium text-zinc-800">
                      {name} · {unit}
                    </span>
                    <span
                      className={
                        tone === "red"
                          ? "rounded-full bg-red-50 px-2 py-0.5 font-medium text-red-700"
                          : "rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-700"
                      }
                    >
                      {days}d
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm">
              <p className="text-xs font-semibold text-zinc-900">Recent rent payments</p>
              <ul className="mt-2 space-y-2 text-[11px] text-zinc-600">
                <li className="flex justify-between">
                  <span>Oak Street — Unit 1</span>
                  <span className="font-medium text-zinc-900">$1,450</span>
                </li>
                <li className="flex justify-between">
                  <span>Maple Duplex — B</span>
                  <span className="font-medium text-zinc-900">$1,200</span>
                </li>
                <li className="flex justify-between">
                  <span>Pine Ave — Main</span>
                  <span className="font-medium text-zinc-900">$2,100</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
