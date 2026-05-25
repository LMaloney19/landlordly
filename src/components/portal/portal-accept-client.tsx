"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { acceptTenantPortalInvite } from "@/app/actions/tenant-portal";
import { createClient } from "@/lib/supabase/client";

type PortalAcceptClientProps = {
  token: string;
};

export function PortalAcceptClient({ token }: PortalAcceptClientProps) {
  const [status, setStatus] = useState<"checking" | "needs_auth" | "accepting" | "done" | "error">(
    "checking",
  );
  const [message, setMessage] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const loginHref = `/login?redirect=${encodeURIComponent(`/portal/accept?token=${token}`)}`;

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (!user) {
        setStatus("needs_auth");
        return;
      }

      setStatus("accepting");
      startTransition(async () => {
        const result = await acceptTenantPortalInvite(token);
        if (cancelled) return;

        if (!result.success) {
          setStatus("error");
          setMessage(result.error);
          return;
        }

        setStatus("done");
        setMessage(
          `Welcome, ${result.data.name}. Your portal is linked — sign in at /portal anytime.`,
        );
      });
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
      <h1 className="text-lg font-semibold text-zinc-900">Set up tenant portal</h1>

      {status === "checking" || status === "accepting" ? (
        <p className="mt-3 text-sm text-zinc-600">Linking your account…</p>
      ) : null}

      {status === "needs_auth" ? (
        <div className="mt-3 space-y-3 text-sm text-zinc-600">
          <p>
            Sign in or create an account with the email your landlord has on file, then open
            this link again to link your portal permanently.
          </p>
          <Link
            href={loginHref}
            className="inline-flex rounded-md bg-zinc-900 px-4 py-2.5 font-medium text-white hover:bg-zinc-800"
          >
            Sign in or create account
          </Link>
        </div>
      ) : null}

      {status === "done" ? (
        <div className="mt-3 space-y-3 text-sm text-emerald-800">
          <p>{message}</p>
          <Link
            href="/portal"
            className="inline-flex rounded-md bg-zinc-900 px-4 py-2.5 font-medium text-white hover:bg-zinc-800"
          >
            Go to portal
          </Link>
        </div>
      ) : null}

      {status === "error" ? (
        <div className="mt-3 space-y-3 text-sm text-red-600" role="alert">
          <p>{message ?? "Could not accept this invite."}</p>
          {message?.includes("already set up") ||
          message?.includes("already linked") ||
          message?.includes("already linked to") ? (
            <Link
              href="/portal"
              className="inline-flex rounded-md border border-zinc-200 px-4 py-2.5 font-medium text-zinc-800 hover:bg-zinc-50"
            >
              Go to portal
            </Link>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
