"use server";

import { createClient } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/supabase/get-user";
import { isSupabaseConfigured } from "@/lib/supabase/config";
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
import { rowToMaintenance, type MaintenanceRow } from "@/lib/maintenance";
import { buildRentAlertsByUnit } from "@/lib/rent-status";
import { addDaysIso, rowToTenant, todayIso, type TenantRow } from "@/lib/tenants";
import type {
  DashboardStats,
  MaintenanceRequest,
  Property,
  RentAlert,
  RentPayment,
  Tenant,
} from "@/types";
import type { ActionResult } from "@/app/actions/properties";

const LEASE_EXPIRY_WINDOW_DAYS = 60;

export type DashboardData = {
  stats: DashboardStats;
  recentProperties: Property[];
  recentPayments: RentPayment[];
  expiringLeases: Tenant[];
  openMaintenance: MaintenanceRequest[];
  overdueRent: RentAlert[];
  rentDueSoon: RentAlert[];
};

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

export async function getDashboardData(): Promise<ActionResult<DashboardData>> {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      error: "Supabase is not configured. Add keys to .env.local.",
    };
  }

  const supabase = await createClient();

  const user = await getServerUser(supabase);

  if (!user) {
    return { success: false, error: "Not authenticated." };
  }

  const monthStart = startOfMonthIso();
  const monthEnd = endOfMonthIso();

  const leaseWindowEnd = addDaysIso(LEASE_EXPIRY_WINDOW_DAYS);
  const leaseWindowStart = todayIso();

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

  if (propertiesResult.error) {
    return { success: false, error: propertiesResult.error.message };
  }

  const properties = (propertiesResult.data as PropertyRow[])
    .filter((property) => !property.archived_at)
    .map(rowToProperty);
  const propertyStats = computePropertyStats(properties);

  let rentCollectedThisMonth = 0;
  let recentPayments: RentPayment[] = [];

  const paymentsTableMissing =
    paymentsResult.error?.message.includes("rent_payments") ||
    monthPaymentsResult.error?.message.includes("rent_payments");

  const tenantsTableMissing =
    expiringLeasesResult.error?.message.includes("tenants") ||
    expiringCountResult.error?.message.includes("tenants");

  const maintenanceTableMissing =
    openMaintenanceResult.error?.message.includes("maintenance_requests") ||
    openMaintenanceCountResult.error?.message.includes("maintenance_requests");

  if (!paymentsResult.error && paymentsResult.data) {
    recentPayments = (paymentsResult.data as RentPaymentRow[]).map(
      rowToRentPayment,
    );
  } else if (paymentsResult.error && !paymentsTableMissing) {
    return { success: false, error: paymentsResult.error.message };
  }

  if (!monthPaymentsResult.error && monthPaymentsResult.data) {
    rentCollectedThisMonth = monthPaymentsResult.data.reduce(
      (sum, row) => sum + Number(row.amount),
      0,
    );
  } else if (monthPaymentsResult.error && !paymentsTableMissing) {
    return { success: false, error: monthPaymentsResult.error.message };
  }

  let expiringLeases: Tenant[] = [];
  let leasesExpiringSoon = 0;

  if (!expiringLeasesResult.error && expiringLeasesResult.data) {
    expiringLeases = (expiringLeasesResult.data as TenantRow[]).map(rowToTenant);
  } else if (expiringLeasesResult.error && !tenantsTableMissing) {
    return { success: false, error: expiringLeasesResult.error.message };
  }

  if (!expiringCountResult.error) {
    leasesExpiringSoon = expiringCountResult.count ?? 0;
  } else if (expiringCountResult.error && !tenantsTableMissing) {
    return { success: false, error: expiringCountResult.error.message };
  }

  let openMaintenance: MaintenanceRequest[] = [];
  let openMaintenanceRequests = 0;

  if (!openMaintenanceResult.error && openMaintenanceResult.data) {
    openMaintenance = (openMaintenanceResult.data as MaintenanceRow[]).map(
      rowToMaintenance,
    );
  } else if (openMaintenanceResult.error && !maintenanceTableMissing) {
    return { success: false, error: openMaintenanceResult.error.message };
  }

  if (!openMaintenanceCountResult.error) {
    openMaintenanceRequests = openMaintenanceCountResult.count ?? 0;
  } else if (openMaintenanceCountResult.error && !maintenanceTableMissing) {
    return { success: false, error: openMaintenanceCountResult.error.message };
  }

  let overdueRent: RentAlert[] = [];
  let rentDueSoon: RentAlert[] = [];
  let overdueRentCount = 0;
  let rentDueSoonCount = 0;

  if (!activeTenantsResult.error && activeTenantsResult.data) {
    const activeTenants = (activeTenantsResult.data as TenantRow[]).map(
      rowToTenant,
    );
    const monthPayments = (monthPaymentsResult.data ?? []).map((row) => ({
      propertyId: row.property_id as string,
      tenantId: (row.tenant_id as string | null) ?? null,
      unitLabel: (row.unit_label as string | null) ?? null,
      paidAt: row.paid_at as string,
      amount: Number(row.amount),
    }));
    const alerts = buildRentAlertsByUnit(activeTenants, properties, monthPayments);
    overdueRent = alerts.overdue.slice(0, 5);
    rentDueSoon = alerts.dueSoon.slice(0, 5);
    overdueRentCount = alerts.overdueCount;
    rentDueSoonCount = alerts.dueSoonCount;
  } else if (activeTenantsResult.error && !tenantsTableMissing) {
    return { success: false, error: activeTenantsResult.error.message };
  }

  return {
    success: true,
    data: {
      stats: {
        ...propertyStats,
        rentCollectedThisMonth,
        openMaintenanceRequests,
        leasesExpiringSoon,
        overdueRentCount,
        rentDueSoonCount,
      },
      recentProperties: properties.slice(0, 5),
      recentPayments,
      expiringLeases,
      openMaintenance,
      overdueRent,
      rentDueSoon,
    },
  };
}
