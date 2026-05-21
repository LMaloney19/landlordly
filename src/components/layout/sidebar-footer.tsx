"use client";

import { SignOutButton } from "@/components/layout/sign-out-button";

type SidebarFooterProps = {
  email?: string;
};

export function SidebarFooter({ email }: SidebarFooterProps) {
  return (
    <footer className="mt-auto shrink-0 border-t border-zinc-200 p-4">
      {email ? (
        <p className="truncate text-xs font-medium text-zinc-900">{email}</p>
      ) : (
        <p className="text-xs text-zinc-500">Signed in</p>
      )}
      <SignOutButton className="mt-2" />
    </footer>
  );
}
