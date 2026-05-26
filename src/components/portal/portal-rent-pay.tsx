"use client";

import { useState, useTransition } from "react";
import { createPortalRentCheckoutSession } from "@/app/actions/portal-stripe";
import { formatCurrency } from "@/lib/utils";

type PortalRentPayProps = {
  monthlyRent: number | null;
  stripeEnabled: boolean;
};

export function PortalRentPay({ monthlyRent, stripeEnabled }: PortalRentPayProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handlePayRent() {
    setError(null);
    startTransition(async () => {
      const result = await createPortalRentCheckoutSession();
      if (!result.success) {
        setError(result.error);
        return;
      }
      window.location.assign(result.data.url);
    });
  }

  if (!stripeEnabled) {
    return (
      <article className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-zinc-900">Pay rent</h2>
        <p className="mt-2 text-sm text-zinc-500">
          Card payments are not enabled yet. Your landlord can turn on Stripe in production
          settings — rent will then record automatically after you pay here.
        </p>
      </article>
    );
  }

  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-sm font-semibold text-zinc-900">Pay rent</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Pay securely with card. Your payment is recorded automatically on your landlord&apos;s
        Rent page and dashboard — no manual entry needed.
      </p>
      {monthlyRent && monthlyRent > 0 ? (
        <p className="mt-3 text-lg font-semibold text-zinc-900">
          {formatCurrency(monthlyRent)}
          <span className="ml-2 text-sm font-normal text-zinc-500">due now</span>
        </p>
      ) : (
        <p className="mt-3 text-sm text-amber-800">
          Monthly rent is not set on your lease. Contact your landlord before paying.
        </p>
      )}
      {error ? (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        onClick={handlePayRent}
        disabled={isPending || !monthlyRent || monthlyRent <= 0}
        className="mt-4 w-full rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
      >
        {isPending ? "Redirecting to checkout…" : "Pay rent with card"}
      </button>
    </article>
  );
}
