"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  CircleDollarSign,
  FileText,
  Hammer,
  Home,
  LayoutDashboard,
  Receipt,
  Users,
  BarChart3,
} from "lucide-react";
import { SidebarAccountFooter } from "@/components/layout/sidebar-account-footer";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/properties", label: "Properties", icon: Building2 },
  { href: "/tenants", label: "Tenants", icon: Users },
  { href: "/rent", label: "Rent", icon: Receipt },
  { href: "/expenses", label: "Expenses", icon: CircleDollarSign },
  { href: "/maintenance", label: "Maintenance", icon: Hammer },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/reports", label: "Reports", icon: BarChart3 },
] as const;

type SidebarProps = {
  userEmail?: string;
};

export function Sidebar({ userEmail }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex min-h-screen w-60 shrink-0 flex-col border-r border-zinc-200 bg-white">
      <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-zinc-200 px-4">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white">
            <Home className="h-4 w-4" aria-hidden />
          </span>
          <span className="truncate text-sm font-semibold tracking-tight text-zinc-900">
            Landlordly
          </span>
        </div>
        <SignOutButton variant="header" />
      </header>

      <nav className="flex-1 space-y-0.5 p-3">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Link
              key={href}
              href={href}
              prefetch={false}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-zinc-100 text-zinc-900"
                  : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <SidebarAccountFooter serverEmail={userEmail} />
    </aside>
  );
}
