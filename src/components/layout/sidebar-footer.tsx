"use client";

import { createClient } from "@/lib/supabase/client";
import { disableDevBypass } from "@/lib/dev-bypass";

type SidebarFooterProps = {
  email: string;
};

export function SidebarFooter({ email }: SidebarFooterProps) {
  async function handleSignOut() {
    disableDevBypass();
    const supabase = createClient();
    await supabase.auth.signOut();
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin",
    });
    window.location.assign("/login");
  }

  return (
    <footer className="border-t border-zinc-200 p-4">
      <p className="truncate text-xs font-medium text-zinc-900">{email}</p>
      <button
        type="button"
        onClick={handleSignOut}
        className="mt-2 text-xs text-zinc-500 transition-colors hover:text-zinc-900"
      >
        Sign out
      </button>
    </footer>
  );
}
