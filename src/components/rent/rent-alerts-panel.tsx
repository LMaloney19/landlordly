"use client";

import Link from "next/link";
import { Bell, CalendarClock } from "lucide-react";
import {
  RENT_DUE_SOON_DAYS,
  rentStatusBadgeClass,
  rentStatusLabel,
} from "@/lib/rent-status";
import { formatCurrency } from "@/lib/utils";
import type { RentAlert } from "@/types";

type RentAlertsPanelProps = {
  overdue: RentAlert[];
  dueSoon: RentAlert[];
  compact?: boolean;
};

function formatDueDate(isoDate: string) {
  return new Date(isoDate + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function AlertList({
  title,
  alerts,
  emptyMessage,
}: {
  title: string;
  alerts: RentAlert[];
  emptyMessage: string;
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {title}
      </h3>
      {alerts.length === 0 ? (
        <p className="mt-2 text-sm text-zinc-500">{emptyMessage}</p>
      ) : (
        <ul className="mt-2 divide-y divide-zinc-100">
          {alerts.map((alert) => (
            <li
              key={alert.tenantId}
              className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
            >
              <div className="min-w-0">
                <p className="font-medium text-zinc-900">{alert.tenantName}</p>
                <p className="truncate text-xs text-zinc-500">
                  {alert.propertyAddress}
                  {alert.unitLabel ? ` · Unit ${alert.unitLabel}` : ""}
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Due {formatDueDate(alert.dueDate)} ·{" "}
                  {formatCurrency(alert.balanceDue)} owed
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${rentStatusBadgeClass(alert.status)}`}
              >
                {rentStatusLabel(alert.status, alert.daysUntilDue)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function RentAlertsPanel({
  overdue,
  dueSoon,
  compact = false,
}: RentAlertsPanelProps) {
  if (overdue.length === 0 && dueSoon.length === 0) {
    return (
      <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <Bell className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Rent on track</h2>
            <p className="mt-1 text-sm text-zinc-500">
              No overdue or upcoming rent due in the next few days.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-zinc-200 bg-white shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
            <CalendarClock className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Rent reminders</h2>
            <p className="text-sm text-zinc-500">
              {overdue.length > 0
                ? `${overdue.length} overdue`
                : "All caught up"}
              {dueSoon.length > 0
                ? `${overdue.length > 0 ? " · " : ""}${dueSoon.length} due soon`
                : ""}
            </p>
          </div>
        </div>
        <Link
          href="/rent"
          className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900"
        >
          Record payment
        </Link>
      </header>

      <div
        className={
          compact
            ? "space-y-6 p-6"
            : "grid gap-6 p-6 md:grid-cols-2"
        }
      >
        <AlertList
          title="Overdue"
          alerts={overdue}
          emptyMessage="No overdue rent this month."
        />
        <AlertList
          title={`Due within ${RENT_DUE_SOON_DAYS} days`}
          alerts={dueSoon}
          emptyMessage="Nothing due in the next few days."
        />
      </div>
    </section>
  );
}
