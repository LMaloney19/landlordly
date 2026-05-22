"use client";

import { signOutAndGoToLogin } from "@/lib/auth-sign-out";

export function PortalSignOutButton() {
  return (
    <button
      type="button"
      onClick={() => void signOutAndGoToLogin("/login?redirect=%2Fportal")}
      className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
    >
      Sign out
    </button>
  );
}
