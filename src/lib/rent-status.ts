import { EXPENSE_WHOLE_PROPERTY_LABEL } from "@/lib/expenses";
import { endOfMonthIso, startOfMonthIso } from "@/lib/rent-payments";
import { todayIso } from "@/lib/tenants";
import type { Property, RentPayment, Tenant } from "@/types";

export const RENT_DUE_SOON_DAYS = 3;

export type RentAlertStatus = "overdue" | "due_soon";

export type RentAlert = {
  tenantId: string;
  tenantName: string;
  propertyId: string;
  propertyAddress: string;
  unitLabel: string | null;
  expectedRent: number;
  collected: number;
  balanceDue: number;
  dueDate: string;
  daysUntilDue: number;
  status: RentAlertStatus;
};

export type RentAlertsSummary = {
  overdue: RentAlert[];
  dueSoon: RentAlert[];
  overdueCount: number;
  dueSoonCount: number;
};

export function normalizeRentDueDay(day: number | null | undefined) {
  const value = Math.floor(Number(day) || 1);
  return Math.min(28, Math.max(1, value));
}

export function rentDueDateForMonth(
  year: number,
  month: number,
  dueDay: number,
): string {
  const safeDay = normalizeRentDueDay(dueDay);
  const lastDay = new Date(year, month + 1, 0).getDate();
  const day = Math.min(safeDay, lastDay);
  const monthPart = String(month + 1).padStart(2, "0");
  const dayPart = String(day).padStart(2, "0");
  return `${year}-${monthPart}-${dayPart}`;
}

export function currentMonthDueDate(dueDay: number, reference = new Date()) {
  return rentDueDateForMonth(
    reference.getFullYear(),
    reference.getMonth(),
    dueDay,
  );
}

export function daysFromToday(isoDate: string) {
  const target = new Date(isoDate + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function resolveExpectedRent(
  tenant: Tenant,
  property: Property | undefined,
): number {
  if (tenant.monthlyRent != null && tenant.monthlyRent > 0) {
    return tenant.monthlyRent;
  }

  const label = tenant.unitLabel?.trim();
  if (label && property) {
    const unit = property.units.find((item) => item.unitLabel === label);
    if (unit) return unit.monthlyRent;
  }

  if (property?.units.length === 1) {
    return property.units[0].monthlyRent;
  }

  return 0;
}

export function isActiveTenant(tenant: Tenant, today = todayIso()) {
  return tenant.leaseEnd >= today;
}

export function paymentAppliesToTenant(
  payment: Pick<RentPayment, "propertyId" | "tenantId" | "unitLabel" | "paidAt">,
  tenant: Tenant,
  monthStart: string,
  monthEnd: string,
) {
  if (payment.paidAt < monthStart || payment.paidAt > monthEnd) {
    return false;
  }

  if (payment.tenantId && payment.tenantId === tenant.id) {
    return true;
  }

  if (payment.propertyId !== tenant.propertyId) {
    return false;
  }

  const tenantUnit = tenant.unitLabel?.trim() || null;
  const paymentUnit = payment.unitLabel?.trim() || null;

  if (tenantUnit && paymentUnit) {
    return tenantUnit === paymentUnit;
  }

  if (!tenantUnit && !paymentUnit) {
    return true;
  }

  return false;
}

export function collectedForTenantThisMonth(
  tenant: Tenant,
  payments: Pick<RentPayment, "propertyId" | "tenantId" | "unitLabel" | "paidAt" | "amount">[],
  monthStart = startOfMonthIso(),
  monthEnd = endOfMonthIso(),
) {
  return payments
    .filter((payment) => paymentAppliesToTenant(payment, tenant, monthStart, monthEnd))
    .reduce((sum, payment) => sum + payment.amount, 0);
}

type RentPaymentPick = Pick<
  RentPayment,
  "propertyId" | "tenantId" | "unitLabel" | "paidAt" | "amount"
>;

function rentPaymentDedupeKey(payment: RentPaymentPick) {
  return `${payment.propertyId}|${payment.tenantId ?? ""}|${payment.unitLabel ?? ""}|${payment.paidAt}|${payment.amount}`;
}

/** Sum rent collected for a unit without counting the same payment twice. */
export function collectedForUnitThisMonth(
  unitTenants: Tenant[],
  payments: RentPaymentPick[],
  monthStart = startOfMonthIso(),
  monthEnd = endOfMonthIso(),
) {
  const seen = new Set<string>();
  let sum = 0;

  for (const payment of payments) {
    const applies = unitTenants.some((tenant) =>
      paymentAppliesToTenant(payment, tenant, monthStart, monthEnd),
    );
    if (!applies) continue;

    const key = rentPaymentDedupeKey(payment);
    if (seen.has(key)) continue;
    seen.add(key);
    sum += payment.amount;
  }

  return sum;
}

export function unitRentAlertId(propertyId: string, unitKey: string) {
  return `${propertyId}::${unitKey}`;
}

/**
 * Rent alerts rolled up per apartment/unit (one row per unit, not per tenant).
 * Use on the dashboard so split leases do not double-count.
 */
export function buildRentAlertsByUnit(
  tenants: Tenant[],
  properties: Property[],
  payments: RentPaymentPick[],
  today = todayIso(),
): RentAlertsSummary {
  const propertyById = new Map(properties.map((property) => [property.id, property]));
  const referenceDate = new Date(today + "T00:00:00");
  const monthStart = startOfMonthIso(referenceDate);
  const monthEnd = endOfMonthIso(referenceDate);

  const tenantsByUnit = new Map<string, Tenant[]>();

  for (const tenant of tenants) {
    if (!isActiveTenant(tenant, today)) continue;

    const property = propertyById.get(tenant.propertyId);
    const expectedRent = resolveExpectedRent(tenant, property);
    if (expectedRent <= 0) continue;

    const unitKey = rentAlertUnitKey(tenant.unitLabel);
    const alertId = unitRentAlertId(tenant.propertyId, unitKey);
    const list = tenantsByUnit.get(alertId) ?? [];
    list.push(tenant);
    tenantsByUnit.set(alertId, list);
  }

  const overdue: RentAlert[] = [];
  const dueSoon: RentAlert[] = [];

  for (const [alertId, unitTenants] of tenantsByUnit) {
    const first = unitTenants[0];
    const property = propertyById.get(first.propertyId);
    const unitKey = rentAlertUnitKey(first.unitLabel);

    const expectedRent = unitTenants.reduce(
      (sum, tenant) => sum + resolveExpectedRent(tenant, property),
      0,
    );
    const collected = collectedForUnitThisMonth(
      unitTenants,
      payments,
      monthStart,
      monthEnd,
    );
    const balanceDue = Math.max(0, expectedRent - collected);

    if (balanceDue < 0.01) continue;

    let daysUntilDue = Infinity;
    let dueDate = currentMonthDueDate(
      normalizeRentDueDay(unitTenants[0].rentDueDay),
      referenceDate,
    );

    for (const tenant of unitTenants) {
      const tenantDueDate = currentMonthDueDate(
        normalizeRentDueDay(tenant.rentDueDay),
        referenceDate,
      );
      const tenantDays = daysFromToday(tenantDueDate);
      if (tenantDays < daysUntilDue) {
        daysUntilDue = tenantDays;
        dueDate = tenantDueDate;
      }
    }

    const base = {
      tenantId: alertId,
      tenantName: formatRentAlertUnitTitle(unitKey),
      propertyId: first.propertyId,
      propertyAddress: first.propertyAddress,
      unitLabel: first.unitLabel,
      expectedRent,
      collected,
      balanceDue,
      dueDate,
      daysUntilDue,
    };

    if (daysUntilDue < 0) {
      overdue.push({ ...base, status: "overdue" as const });
    } else if (daysUntilDue <= RENT_DUE_SOON_DAYS) {
      dueSoon.push({ ...base, status: "due_soon" as const });
    }
  }

  overdue.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
  dueSoon.sort((a, b) => a.daysUntilDue - b.daysUntilDue);

  return {
    overdue,
    dueSoon,
    overdueCount: overdue.length,
    dueSoonCount: dueSoon.length,
  };
}

export function buildRentAlerts(
  tenants: Tenant[],
  properties: Property[],
  payments: RentPaymentPick[],
  today = todayIso(),
): RentAlertsSummary {
  const propertyById = new Map(properties.map((property) => [property.id, property]));
  const monthStart = startOfMonthIso(new Date(today + "T00:00:00"));
  const monthEnd = endOfMonthIso(new Date(today + "T00:00:00"));

  const overdue: RentAlert[] = [];
  const dueSoon: RentAlert[] = [];

  for (const tenant of tenants) {
    if (!isActiveTenant(tenant, today)) continue;

    const property = propertyById.get(tenant.propertyId);
    const expectedRent = resolveExpectedRent(tenant, property);
    if (expectedRent <= 0) continue;

    const dueDate = currentMonthDueDate(
      normalizeRentDueDay(tenant.rentDueDay),
      new Date(today + "T00:00:00"),
    );
    const collected = collectedForTenantThisMonth(
      tenant,
      payments,
      monthStart,
      monthEnd,
    );
    const balanceDue = Math.max(0, expectedRent - collected);

    if (balanceDue < 0.01) continue;

    const daysUntilDue = daysFromToday(dueDate);
    const base = {
      tenantId: tenant.id,
      tenantName: tenant.name,
      propertyId: tenant.propertyId,
      propertyAddress: tenant.propertyAddress,
      unitLabel: tenant.unitLabel,
      expectedRent,
      collected,
      balanceDue,
      dueDate,
      daysUntilDue,
    };

    if (daysUntilDue < 0) {
      overdue.push({ ...base, status: "overdue" });
    } else if (daysUntilDue <= RENT_DUE_SOON_DAYS) {
      dueSoon.push({ ...base, status: "due_soon" });
    }
  }

  overdue.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
  dueSoon.sort((a, b) => a.daysUntilDue - b.daysUntilDue);

  return {
    overdue,
    dueSoon,
    overdueCount: overdue.length,
    dueSoonCount: dueSoon.length,
  };
}

export function rentStatusBadgeClass(status: RentAlertStatus | "paid") {
  if (status === "overdue") return "bg-red-50 text-red-800 ring-red-100";
  if (status === "due_soon") return "bg-amber-50 text-amber-800 ring-amber-100";
  return "bg-emerald-50 text-emerald-800 ring-emerald-100";
}

export function rentStatusLabel(
  status: RentAlertStatus | "paid",
  daysUntilDue?: number,
) {
  if (status === "paid") return "Paid";
  if (status === "overdue") {
    const days = Math.abs(daysUntilDue ?? 0);
    return days === 0 ? "Overdue" : `${days}d overdue`;
  }
  if (daysUntilDue === 0) return "Due today";
  if (daysUntilDue === 1) return "Due tomorrow";
  return `Due in ${daysUntilDue}d`;
}

export function tenantRentStatus(
  tenant: Tenant,
  property: Property | undefined,
  payments: Pick<
    RentPayment,
    "propertyId" | "tenantId" | "unitLabel" | "paidAt" | "amount"
  >[],
  today = todayIso(),
): RentAlertStatus | "paid" | null {
  if (!isActiveTenant(tenant, today)) return null;

  const expectedRent = resolveExpectedRent(tenant, property);
  if (expectedRent <= 0) return null;

  const dueDate = currentMonthDueDate(
    normalizeRentDueDay(tenant.rentDueDay),
    new Date(today + "T00:00:00"),
  );
  const collected = collectedForTenantThisMonth(tenant, payments);
  const balanceDue = Math.max(0, expectedRent - collected);

  if (balanceDue < 0.01) return "paid";

  const daysUntilDue = daysFromToday(dueDate);
  if (daysUntilDue < 0) return "overdue";
  if (daysUntilDue <= RENT_DUE_SOON_DAYS) return "due_soon";

  return null;
}

export function rentAlertUnitKey(unitLabel: string | null | undefined) {
  const trimmed = unitLabel?.trim();
  return trimmed ? trimmed : EXPENSE_WHOLE_PROPERTY_LABEL;
}

export function formatRentAlertUnitTitle(unitLabel: string) {
  if (unitLabel === EXPENSE_WHOLE_PROPERTY_LABEL) return "Whole property";
  return `Unit ${unitLabel}`;
}

export type RentAlertUnitGroup = {
  unitLabel: string;
  alertCount: number;
  overdueCount: number;
  dueSoonCount: number;
  alerts: RentAlert[];
};

export type RentAlertPropertyGroup = {
  propertyId: string;
  propertyAddress: string;
  alertCount: number;
  overdueCount: number;
  dueSoonCount: number;
  units: RentAlertUnitGroup[];
};

/** Group rent alerts by property, then unit (overdue before due soon within each unit). */
export function groupRentAlertsByPropertyAndUnit(
  overdue: RentAlert[],
  dueSoon: RentAlert[],
  properties: { id: string; formattedAddress: string; units: { unitLabel: string }[] }[],
): RentAlertPropertyGroup[] {
  const allAlerts = [...overdue, ...dueSoon];
  const propertyOrder = new Map(
    properties.map((property, index) => [property.id, index]),
  );

  const byProperty = new Map<string, RentAlert[]>();
  for (const alert of allAlerts) {
    const list = byProperty.get(alert.propertyId) ?? [];
    list.push(alert);
    byProperty.set(alert.propertyId, list);
  }

  const groups: RentAlertPropertyGroup[] = [];

  for (const [propertyId, propertyAlerts] of byProperty) {
    const property = properties.find((item) => item.id === propertyId);
    const address =
      property?.formattedAddress ??
      propertyAlerts[0]?.propertyAddress ??
      "Property";

    const unitKeys = new Set<string>();
    if (property) {
      for (const unit of property.units) {
        unitKeys.add(unit.unitLabel);
      }
    }
    for (const alert of propertyAlerts) {
      unitKeys.add(rentAlertUnitKey(alert.unitLabel));
    }

    const sortedUnits = [...unitKeys].sort((a, b) => {
      if (a === EXPENSE_WHOLE_PROPERTY_LABEL) return -1;
      if (b === EXPENSE_WHOLE_PROPERTY_LABEL) return 1;
      return a.localeCompare(b, undefined, { numeric: true });
    });

    const units: RentAlertUnitGroup[] = sortedUnits
      .map((unitLabel) => {
        const unitAlerts = propertyAlerts
          .filter((alert) => rentAlertUnitKey(alert.unitLabel) === unitLabel)
          .sort((a, b) => {
            if (a.status !== b.status) {
              return a.status === "overdue" ? -1 : 1;
            }
            return a.daysUntilDue - b.daysUntilDue;
          });

        return {
          unitLabel,
          alertCount: unitAlerts.length,
          overdueCount: unitAlerts.filter((alert) => alert.status === "overdue")
            .length,
          dueSoonCount: unitAlerts.filter((alert) => alert.status === "due_soon")
            .length,
          alerts: unitAlerts,
        };
      })
      .filter((unit) => unit.alertCount > 0);

    groups.push({
      propertyId,
      propertyAddress: address,
      alertCount: propertyAlerts.length,
      overdueCount: propertyAlerts.filter((alert) => alert.status === "overdue")
        .length,
      dueSoonCount: propertyAlerts.filter((alert) => alert.status === "due_soon")
        .length,
      units,
    });
  }

  groups.sort((a, b) => {
    const orderA = propertyOrder.get(a.propertyId) ?? 999;
    const orderB = propertyOrder.get(b.propertyId) ?? 999;
    if (orderA !== orderB) return orderA - orderB;
    return a.propertyAddress.localeCompare(b.propertyAddress);
  });

  return groups;
}
