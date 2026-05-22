"use client";

import {
  AlertTriangle,
  Bell,
  Building2,
  CalendarClock,
  DollarSign,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { DashboardData } from "@/app/actions/dashboard";
import { StatCard } from "@/components/dashboard/stat-card";
import { PageHeader } from "@/components/ui/page-header";
import { hasDevBypass } from "@/lib/dev-bypass";
import { rowToMaintenance, type MaintenanceRow } from "@/lib/maintenance";
import {
  PROPERTY_ADDRESS_SELECT,
  PROPERTY_WITH_UNITS_SELECT,
  rowToProperty,
  type PropertyRow,
} from "@/lib/properties";
import {
  endOfMonthIso,
  rowToRentPayment,
  startOfMonthIso,
  type RentPaymentRow,
} from "@/lib/rent-payments";
import { createClient } from "@/lib/supabase/client";
import { buildRentAlerts } from "@/lib/rent-status";
import { addDaysIso, daysUntil, rowToTenant, todayIso, type TenantRow } from "@/lib/tenants";
import { formatCurrency } from "@/lib/utils";
import type { DashboardStats, Property } from "@/types";

const LEASE_EXPIRY_WINDOW_DAYS = 60;

function emptyDashboardData(): DashboardData {
  return {
    stats: {
      totalUnits: 0,
      propertyCount: 0,
      expectedMonthlyRent: 0,
      rentCollectedThisMonth: 0,
      openMaintenanceRequests: 0,
      leasesExpiringSoon: 0,
      overdueRentCount: 0,
      rentDueSoonCount: 0,
    },
    recentProperties: [],
    recentPayments: [],
    expiringLeases: [],
    openMaintenance: [],
    overdueRent: [],
    rentDueSoon: [],
  };
}

function computePropertyStats(properties: Property[]): Pick<
  DashboardStats,
  "totalUnits" | "expectedMonthlyRent" | "propertyCount"
> {
  const totalUnits = properties.reduce((sum, p) => sum + p.unitCount, 0);
  const expectedMonthlyRent = properties.reduce(
    (sum, p) => sum + p.totalMonthlyRent,
    0,
  );

  return {
    totalUnits,
    expectedMonthlyRent,
    propertyCount: properties.length,
  };
}

function formatPaidDate(isoDate: string) {
  return new Date(isoDate + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function leaseDaysClassName(days: number) {
  if (days < 30) return "bg-red-50 text-red-700";
  if (days < 60) return "bg-amber-50 text-amber-700";
  return "bg-emerald-50 text-emerald-700";
}

type DashboardPageClientProps = {
  initialData: DashboardData;
  initialError?: string | null;
};

export function DashboardPageClient({
  initialData,
  initialError = null,
}: DashboardPageClientProps) {
  const [data, setData] = useState(initialData);
  const [error, setError] = useState(initialError);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboardData() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (hasDevBypass()) {
          setData(emptyDashboardData());
          setError(null);
          return;
        }

        setError("Sign in to load your dashboard data.");
        return;
      }

      const monthStart = startOfMonthIso();
      const monthEnd = endOfMonthIso();
      const leaseWindowStart = todayIso();
      const leaseWindowEnd = addDaysIso(LEASE_EXPIRY_WINDOW_DAYS);

      const [
        propertiesResult,
        paymentsResult,
        monthPaymentsResult,
        expiringLeasesResult,
        expiringCountResult,
        openMaintenanceResult,
        openMaintenanceCountResult,
        activeTenantsResult,
      ] = await Promise.all([
        supabase
          .from("properties")
          .select(PROPERTY_WITH_UNITS_SELECT)
          .order("created_at", { ascending: false }),
        supabase
          .from("rent_payments")
          .select(`*, properties(${PROPERTY_ADDRESS_SELECT})`)
          .order("paid_at", { ascending: false })
          .limit(5),
        supabase
          .from("rent_payments")
          .select("amount, property_id, tenant_id, unit_label, paid_at")
          .gte("paid_at", monthStart)
          .lte("paid_at", monthEnd),
        supabase
          .from("tenants")
          .select(`*, properties(${PROPERTY_ADDRESS_SELECT})`)
          .gte("lease_end", leaseWindowStart)
          .lte("lease_end", leaseWindowEnd)
          .order("lease_end", { ascending: true }),
        supabase
          .from("tenants")
          .select("*", { count: "exact", head: true })
          .gte("lease_end", leaseWindowStart)
          .lte("lease_end", leaseWindowEnd),
        supabase
          .from("maintenance_requests")
          .select(`*, properties(${PROPERTY_ADDRESS_SELECT})`)
          .in("status", ["open", "in_progress"])
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("maintenance_requests")
          .select("*", { count: "exact", head: true })
          .in("status", ["open", "in_progress"]),
        supabase
          .from("tenants")
          .select(`*, properties(${PROPERTY_ADDRESS_SELECT})`)
          .is("archived_at", null)
          .gte("lease_end", leaseWindowStart),
      ]);

      if (cancelled) return;

      if (propertiesResult.error) {
        setError(propertiesResult.error.message);
        return;
      }

      const properties = (propertiesResult.data as PropertyRow[])
        .filter((property) => !property.archived_at)
        .map(rowToProperty);
      const propertyStats = computePropertyStats(properties);

      const paymentsTableMissing =
        paymentsResult.error?.message.includes("rent_payments") ||
        monthPaymentsResult.error?.message.includes("rent_payments");
      const tenantsTableMissing =
        expiringLeasesResult.error?.message.includes("tenants") ||
        expiringCountResult.error?.message.includes("tenants");
      const maintenanceTableMissing =
        openMaintenanceResult.error?.message.includes("maintenance_requests") ||
        openMaintenanceCountResult.error?.message.includes("maintenance_requests");

      if (paymentsResult.error && !paymentsTableMissing) {
        setError(paymentsResult.error.message);
        return;
      }

      if (monthPaymentsResult.error && !paymentsTableMissing) {
        setError(monthPaymentsResult.error.message);
        return;
      }

      if (expiringLeasesResult.error && !tenantsTableMissing) {
        setError(expiringLeasesResult.error.message);
        return;
      }

      if (expiringCountResult.error && !tenantsTableMissing) {
        setError(expiringCountResult.error.message);
        return;
      }

      if (openMaintenanceResult.error && !maintenanceTableMissing) {
        setError(openMaintenanceResult.error.message);
        return;
      }

      if (openMaintenanceCountResult.error && !maintenanceTableMissing) {
        setError(openMaintenanceCountResult.error.message);
        return;
      }

      const rentCollectedThisMonth = monthPaymentsResult.data
        ? monthPaymentsResult.data.reduce(
            (sum, row) => sum + Number(row.amount),
            0,
          )
        : 0;

      const activeTenants = activeTenantsResult.data
        ? (activeTenantsResult.data as TenantRow[]).map(rowToTenant)
        : [];
      const monthPayments = monthPaymentsResult.data
        ? monthPaymentsResult.data.map((row) => ({
            propertyId: row.property_id as string,
            tenantId: (row.tenant_id as string | null) ?? null,
            unitLabel: (row.unit_label as string | null) ?? null,
            paidAt: row.paid_at as string,
            amount: Number(row.amount),
          }))
        : [];
      const rentAlerts = buildRentAlerts(activeTenants, properties, monthPayments);

      setError(null);
      setData({
        stats: {
          ...propertyStats,
          rentCollectedThisMonth,
          openMaintenanceRequests: openMaintenanceCountResult.count ?? 0,
          leasesExpiringSoon: expiringCountResult.count ?? 0,
          overdueRentCount: rentAlerts.overdueCount,
          rentDueSoonCount: rentAlerts.dueSoonCount,
        },
        recentProperties: properties.slice(0, 5),
        recentPayments: paymentsResult.data
          ? (paymentsResult.data as RentPaymentRow[]).map(rowToRentPayment)
          : [],
        expiringLeases: expiringLeasesResult.data
          ? (expiringLeasesResult.data as TenantRow[]).map(rowToTenant)
          : [],
        openMaintenance: openMaintenanceResult.data
          ? (openMaintenanceResult.data as MaintenanceRow[]).map(rowToMaintenance)
          : [],
        overdueRent: rentAlerts.overdue.slice(0, 5),
        rentDueSoon: rentAlerts.dueSoon.slice(0, 5),
      });
    }

    void loadDashboardData();

    return () => {
      cancelled = true;
    };
  }, []);

  const {
    stats,
    recentProperties,
    recentPayments,
    expiringLeases,
    openMaintenance,
    overdueRent,
    rentDueSoon,
  } = data;

  const rentSubtitle =
    stats.expectedMonthlyRent > 0
      ? `${formatCurrency(stats.rentCollectedThisMonth)} of ${formatCurrency(stats.expectedMonthlyRent)} expected`
      : "This month";

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Overview of your portfolio at a glance."
      />

      {error ? (
        <p
          className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard
          title="Total units"
          value={String(stats.totalUnits)}
          subtitle={
            stats.propertyCount === 0
              ? "No properties yet"
              : `${stats.propertyCount} ${stats.propertyCount === 1 ? "property" : "properties"}`
          }
          icon={Building2}
        />
        <StatCard
          title="Rent collected"
          value={formatCurrency(stats.rentCollectedThisMonth)}
          subtitle={rentSubtitle}
          icon={DollarSign}
          accent="positive"
        />
        <StatCard
          title="Open maintenance"
          value={String(stats.openMaintenanceRequests)}
          subtitle={
            stats.openMaintenanceRequests === 0
              ? "No open requests"
              : "Open or in progress"
          }
          icon={AlertTriangle}
          accent={stats.openMaintenanceRequests > 0 ? "warning" : "default"}
        />
        <StatCard
          title="Rent overdue"
          value={String(stats.overdueRentCount)}
          subtitle={
            stats.overdueRentCount === 0
              ? "All caught up this month"
              : "Needs payment"
          }
          icon={Bell}
          accent={stats.overdueRentCount > 0 ? "warning" : "default"}
        />
        <StatCard
          title="Leases expiring"
          value={String(stats.leasesExpiringSoon)}
          subtitle={
            stats.leasesExpiringSoon === 0
              ? "None in the next 60 days"
              : "Within 60 days"
          }
          icon={CalendarClock}
          accent={stats.leasesExpiringSoon > 0 ? "warning" : "default"}
        />
      </section>

      {(overdueRent.length > 0 || rentDueSoon.length > 0) ? (
        <section className="mt-8">
          <article className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
            <header className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-900">Rent alerts</h2>
              <Link
                href="/rent"
                className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900"
              >
                View rent
              </Link>
            </header>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Overdue
                </h3>
                {overdueRent.length === 0 ? (
                  <p className="mt-2 text-sm text-zinc-500">None overdue.</p>
                ) : (
                  <ul className="mt-2 divide-y divide-zinc-100">
                    {overdueRent.map((alert) => (
                      <li
                        key={alert.tenantId}
                        className="flex items-center justify-between gap-3 py-3 text-sm"
                      >
                        <span className="min-w-0 text-zinc-700">
                          <span className="block truncate font-medium text-zinc-900">
                            {alert.tenantName}
                          </span>
                          <span className="block truncate text-xs text-zinc-500">
                            {formatCurrency(alert.balanceDue)} owed
                          </span>
                        </span>
                        <span className="shrink-0 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                          Overdue
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Due soon
                </h3>
                {rentDueSoon.length === 0 ? (
                  <p className="mt-2 text-sm text-zinc-500">Nothing due soon.</p>
                ) : (
                  <ul className="mt-2 divide-y divide-zinc-100">
                    {rentDueSoon.map((alert) => (
                      <li
                        key={alert.tenantId}
                        className="flex items-center justify-between gap-3 py-3 text-sm"
                      >
                        <span className="min-w-0 text-zinc-700">
                          <span className="block truncate font-medium text-zinc-900">
                            {alert.tenantName}
                          </span>
                          <span className="block truncate text-xs text-zinc-500">
                            Due {formatPaidDate(alert.dueDate)}
                          </span>
                        </span>
                        <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                          {alert.daysUntilDue === 0
                            ? "Today"
                            : `${alert.daysUntilDue}d`}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </article>
        </section>
      ) : null}

      <section className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <header className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900">
              Open maintenance
            </h2>
            <Link
              href="/maintenance"
              className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900"
            >
              View all
            </Link>
          </header>

          {openMaintenance.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500">No open requests.</p>
          ) : (
            <ul className="mt-4 divide-y divide-zinc-100">
              {openMaintenance.map((request) => (
                <li
                  key={request.id}
                  className="flex items-center justify-between gap-2 py-3 text-sm"
                >
                  <span className="truncate text-zinc-700">{request.title}</span>
                  <span className="shrink-0 text-xs font-medium capitalize text-amber-600">
                    {request.status.replace("_", " ")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <header className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900">
              Leases expiring soon
            </h2>
            <Link
              href="/tenants"
              className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900"
            >
              Manage tenants
            </Link>
          </header>

          {expiringLeases.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500">
              No leases expiring in the next 60 days.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-zinc-100">
              {expiringLeases.map((tenant) => {
                const daysRemaining = daysUntil(tenant.leaseEnd);

                return (
                  <li
                    key={tenant.id}
                    className="flex items-center justify-between gap-4 py-3 text-sm"
                  >
                    <span className="min-w-0 text-zinc-700">
                      <span className="block truncate font-medium text-zinc-900">
                        {tenant.name}
                      </span>
                      <span className="block truncate text-xs text-zinc-500">
                        Unit {tenant.unitLabel || "not set"}
                      </span>
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${leaseDaysClassName(daysRemaining)}`}
                    >
                      {daysRemaining} {daysRemaining === 1 ? "day" : "days"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </article>
        <article className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <header className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900">
              Recent payments
            </h2>
            <Link
              href="/rent"
              className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900"
            >
              Record rent
            </Link>
          </header>

          {recentPayments.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500">
              No payments this period.{" "}
              <Link href="/rent" className="font-medium text-zinc-900 underline">
                Record a payment
              </Link>
              .
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-zinc-100">
              {recentPayments.map((payment) => (
                <li
                  key={payment.id}
                  className="flex items-center justify-between py-3 text-sm"
                >
                  <span className="text-zinc-700">
                    {payment.propertyAddress} · {formatPaidDate(payment.paidAt)}
                  </span>
                  <span className="font-medium text-emerald-600">
                    +{formatCurrency(payment.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <header className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900">
              Your properties
            </h2>
            <Link
              href="/properties"
              className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900"
            >
              View all
            </Link>
          </header>

          {recentProperties.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500">
              No properties yet.{" "}
              <Link
                href="/properties"
                className="font-medium text-zinc-900 underline"
              >
                Add your first property
              </Link>
              .
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-zinc-100">
              {recentProperties.map((property) => (
                <li
                  key={property.id}
                  className="flex items-center justify-between py-3 text-sm"
                >
                  <span className="text-zinc-700">{property.formattedAddress}</span>
                  <span className="font-medium text-zinc-900">
                    {property.unitCount} units ·{" "}
                    {formatCurrency(property.totalMonthlyRent)}/mo
                  </span>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>
    </>
  );
}
