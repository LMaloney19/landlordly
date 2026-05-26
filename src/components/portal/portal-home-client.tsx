"use client";

import { useState, useTransition, type FormEvent } from "react";
import {
  getPortalHomeData,
  submitPortalMaintenanceRequest,
  type PortalHomeData,
} from "@/app/actions/tenant-portal";
import { PortalRentPay } from "@/components/portal/portal-rent-pay";
import { PRIORITY_LABELS, STATUS_LABELS } from "@/lib/maintenance";
import { formatCurrency } from "@/lib/utils";
import type { MaintenancePriority, MaintenanceRequest, RentPayment } from "@/types";

type PortalHomeClientProps = {
  initial: PortalHomeData | null;
  initialError: string | null;
  needsLink: boolean;
  stripeEnabled: boolean;
  checkoutNotice?: "success" | "cancelled" | null;
};

function formatDate(isoDate: string) {
  return new Date(isoDate + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const inputClass =
  "mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200";

export function PortalHomeClient({
  initial,
  initialError,
  needsLink,
  stripeEnabled,
  checkoutNotice = null,
}: PortalHomeClientProps) {
  const [data, setData] = useState<PortalHomeData | null>(initial);
  const [pageError, setPageError] = useState(initialError);
  const [maintenanceError, setMaintenanceError] = useState<string | null>(null);
  const [maintenancePending, startMaintenanceTransition] = useTransition();
  const [refreshPending, startRefreshTransition] = useTransition();

  const tenant = data?.tenant;

  function refreshHome() {
    startRefreshTransition(async () => {
      const result = await getPortalHomeData();
      if (!result.success) {
        setPageError(result.error);
        return;
      }
      setData(result.data);
      setPageError(null);
    });
  }

  function handleMaintenanceSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMaintenanceError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const title = String(formData.get("title") ?? "");
    const description = String(formData.get("description") ?? "");
    const priority = String(formData.get("priority") ?? "medium") as MaintenancePriority;

    startMaintenanceTransition(async () => {
      const result = await submitPortalMaintenanceRequest({
        title,
        description,
        priority,
      });

      if (!result.success) {
        setMaintenanceError(result.error);
        return;
      }

      form.reset();
      setData((current) =>
        current
          ? {
              ...current,
              openMaintenance: [result.data, ...current.openMaintenance],
            }
          : current,
      );
    });
  }

  if (needsLink) {
    return (
      <section className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        <h1 className="text-lg font-semibold text-amber-950">Finish setup</h1>
        <p className="mt-2">
          Sign in with the email on your lease, open the portal access link your landlord
          sent once, then bookmark /portal. After setup, you do not need the link again.
        </p>
      </section>
    );
  }

  if (!tenant) {
    return (
      <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
        {pageError ?? "Could not load your portal."}
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Hello, {tenant.name}
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          {tenant.propertyAddress}
          {tenant.unitLabel ? ` · Unit ${tenant.unitLabel}` : ""}
        </p>
        {tenant.monthlyRent ? (
          <p className="mt-2 text-sm text-zinc-500">
            Monthly rent: {formatCurrency(tenant.monthlyRent)} · due day {tenant.rentDueDay}
          </p>
        ) : null}
      </header>

      {checkoutNotice === "success" ? (
        <p
          className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          role="status"
        >
          Payment received — it may take a few seconds to appear below.{" "}
          <button
            type="button"
            onClick={refreshHome}
            disabled={refreshPending}
            className="font-medium underline"
          >
            Refresh
          </button>
        </p>
      ) : null}

      {checkoutNotice === "cancelled" ? (
        <p className="rounded-md border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
          Checkout cancelled. You can pay rent anytime from this page.
        </p>
      ) : null}

      {pageError ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800" role="alert">
          {pageError}
          <button
            type="button"
            onClick={refreshHome}
            disabled={refreshPending}
            className="ml-2 font-medium underline"
          >
            Retry
          </button>
        </p>
      ) : null}

      <section className="grid gap-6 md:grid-cols-2">
        <PortalRentPay monthlyRent={tenant.monthlyRent} stripeEnabled={stripeEnabled} />

        <article className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-zinc-900">Maintenance request</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Open a request for your unit. Your landlord sees it on Maintenance immediately.
          </p>
          <form className="mt-4 space-y-4" onSubmit={handleMaintenanceSubmit}>
            <label className="block text-sm font-medium text-zinc-700">
              Issue
              <input
                type="text"
                name="title"
                required
                className={inputClass}
                placeholder="Leaking kitchen faucet"
              />
            </label>
            <label className="block text-sm font-medium text-zinc-700">
              Details (optional)
              <textarea
                name="description"
                rows={3}
                className={inputClass}
                placeholder="When it started, access instructions, etc."
              />
            </label>
            <label className="block text-sm font-medium text-zinc-700">
              Priority
              <select name="priority" defaultValue="medium" className={inputClass}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>
            {maintenanceError ? (
              <p className="text-sm text-red-600" role="alert">
                {maintenanceError}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={maintenancePending}
              className="w-full rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
            >
              {maintenancePending ? "Submitting…" : "Submit request"}
            </button>
          </form>
        </article>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <PortalMaintenanceList items={data?.openMaintenance ?? []} />
        <PortalPaymentsList items={data?.recentPayments ?? []} />
      </section>
    </div>
  );
}

function PortalMaintenanceList({ items }: { items: MaintenanceRequest[] }) {
  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-sm font-semibold text-zinc-900">Your open requests</h2>
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">No open maintenance requests.</p>
      ) : (
        <ul className="mt-4 divide-y divide-zinc-100">
          {items.map((item) => (
            <li key={item.id} className="py-3 text-sm">
              <p className="font-medium text-zinc-900">{item.title}</p>
              <p className="mt-1 text-zinc-500">
                {STATUS_LABELS[item.status] ?? item.status} ·{" "}
                {PRIORITY_LABELS[item.priority] ?? item.priority}
              </p>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function PortalPaymentsList({ items }: { items: RentPayment[] }) {
  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-sm font-semibold text-zinc-900">Recent payments</h2>
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">No payments recorded yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-zinc-100">
          {items.map((payment) => (
            <li key={payment.id} className="flex justify-between gap-4 py-3 text-sm">
              <div>
                <p className="font-medium text-zinc-900">{formatCurrency(payment.amount)}</p>
                <p className="mt-0.5 text-zinc-500">{formatDate(payment.paidAt)}</p>
                {payment.notes ? <p className="mt-1 text-zinc-600">{payment.notes}</p> : null}
              </div>
              {payment.source === "stripe" ? (
                <span className="text-xs text-emerald-700">Paid online</span>
              ) : payment.source === "tenant_portal" ? (
                <span className="text-xs text-zinc-500">Reported</span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
