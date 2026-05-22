import Link from "next/link";
import { Home } from "lucide-react";
import { PortalSignOutButton } from "@/components/portal/portal-sign-out-button";

type PortalShellProps = {
  children: React.ReactNode;
  userEmail?: string | null;
};

export function PortalShell({ children, userEmail }: PortalShellProps) {
  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/portal" className="flex items-center gap-2 text-zinc-900">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-900 text-white">
              <Home className="h-4 w-4" aria-hidden />
            </span>
            <span>
              <span className="block text-sm font-semibold">Tenant portal</span>
              <span className="block text-xs text-zinc-500">Landlordly</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            {userEmail ? (
              <span className="hidden text-xs text-zinc-500 sm:inline">{userEmail}</span>
            ) : null}
            <PortalSignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
