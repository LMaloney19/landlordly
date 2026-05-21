"use server";

import { createClient } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/supabase/get-user";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { PROPERTY_WITH_UNITS_SELECT, rowToProperty, type PropertyRow } from "@/lib/properties";
import {
  endOfMonthIso,
  startOfMonthIso,
} from "@/lib/rent-payments";

export type RentByMonth = {
  month: string;
  label: string;
  total: number;
};

export type ReportData = {
  propertyCount: number;
  totalUnits: number;
  expectedMonthlyRent: number;
  tenantCount: number;
  openMaintenance: number;
  rentCollectedThisMonth: number;
  rentCollectedYtd: number;
  totalPayments: number;
  rentByMonth: RentByMonth[];
};

export type ReportResult =
  | { success: true; data: ReportData }
  | { success: false; error: string };

function monthKey(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

function lastSixMonthKeys() {
  const keys: string[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(monthKey(d.getFullYear(), d.getMonth()));
  }
  return keys;
}

export async function getReportData(): Promise<ReportResult> {
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

  const yearStart = `${new Date().getFullYear()}-01-01`;
  const monthStart = startOfMonthIso();
  const monthEnd = endOfMonthIso();
  const sixMonthsAgo = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 5);
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  })();

  const [
    propertiesResult,
    tenantsResult,
    maintenanceResult,
    monthRentResult,
    ytdRentResult,
    allPaymentsResult,
    rentHistoryResult,
  ] = await Promise.all([
    supabase.from("properties").select(PROPERTY_WITH_UNITS_SELECT),
    supabase.from("tenants").select("*", { count: "exact", head: true }),
    supabase
      .from("maintenance_requests")
      .select("*", { count: "exact", head: true })
      .in("status", ["open", "in_progress"]),
    supabase
      .from("rent_payments")
      .select("amount")
      .gte("paid_at", monthStart)
      .lte("paid_at", monthEnd),
    supabase
      .from("rent_payments")
      .select("amount")
      .gte("paid_at", yearStart),
    supabase.from("rent_payments").select("*", { count: "exact", head: true }),
    supabase
      .from("rent_payments")
      .select("amount, paid_at")
      .gte("paid_at", sixMonthsAgo),
  ]);

  if (propertiesResult.error) {
    return { success: false, error: propertiesResult.error.message };
  }

  const properties = (propertiesResult.data as PropertyRow[]).map(rowToProperty);
  const totalUnits = properties.reduce((s, p) => s + p.unitCount, 0);
  const expectedMonthlyRent = properties.reduce(
    (s, p) => s + p.totalMonthlyRent,
    0,
  );

  const rentCollectedThisMonth = (monthRentResult.data ?? []).reduce(
    (s, r) => s + Number(r.amount),
    0,
  );
  const rentCollectedYtd = (ytdRentResult.data ?? []).reduce(
    (s, r) => s + Number(r.amount),
    0,
  );

  const totalsByMonth = new Map<string, number>();
  for (const key of lastSixMonthKeys()) {
    totalsByMonth.set(key, 0);
  }

  if (!rentHistoryResult.error && rentHistoryResult.data) {
    for (const row of rentHistoryResult.data) {
      const key = String(row.paid_at).slice(0, 7);
      if (totalsByMonth.has(key)) {
        totalsByMonth.set(key, (totalsByMonth.get(key) ?? 0) + Number(row.amount));
      }
    }
  }

  const rentByMonth: RentByMonth[] = lastSixMonthKeys().map((key) => ({
    month: key,
    label: monthLabel(key),
    total: totalsByMonth.get(key) ?? 0,
  }));

  return {
    success: true,
    data: {
      propertyCount: properties.length,
      totalUnits,
      expectedMonthlyRent,
      tenantCount: tenantsResult.count ?? 0,
      openMaintenance: maintenanceResult.count ?? 0,
      rentCollectedThisMonth,
      rentCollectedYtd,
      totalPayments: allPaymentsResult.count ?? 0,
      rentByMonth,
    },
  };
}
