"use client";

import { signOutAndGoToLogin } from "@/lib/auth-sign-out";
import { cn } from "@/lib/utils";

type SignOutButtonProps = {
  className?: string;
  variant?: "footer" | "header";
};

export function SignOutButton({
  className,
  variant = "footer",
}: SignOutButtonProps) {
  return (
    <button
      type="button"
      onClick={() => void signOutAndGoToLogin()}
      className={cn(
        variant === "header"
          ? "rounded-md border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-600 transition-colors hover:border-zinc-300 hover:text-zinc-900"
          : "text-xs text-zinc-500 transition-colors hover:text-zinc-900",
        className,
      )}
    >
      Sign out
    </button>
  );
}
