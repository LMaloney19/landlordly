import {
  formatAddressFromJoin,
  type PropertyAddressFields,
} from "@/lib/properties";
import type { Tenant } from "@/types";

export type TenantRow = {
  id: string;
  user_id: string;
  property_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  unit_label: string | null;
  lease_start: string | null;
  lease_end: string;
  monthly_rent: number | null;
  security_deposit?: number | null;
  pet_name?: string | null;
  pet_type?: string | null;
  created_at: string;
  archived_at?: string | null;
  properties: PropertyAddressFields | PropertyAddressFields[] | null;
};

export function rowToTenant(row: TenantRow): Tenant {
  return {
    id: row.id,
    propertyId: row.property_id,
    propertyAddress: formatAddressFromJoin(row.properties),
    name: row.name,
    email: row.email,
    phone: row.phone,
    unitLabel: row.unit_label,
    leaseStart: row.lease_start,
    leaseEnd: row.lease_end,
    monthlyRent: row.monthly_rent != null ? Number(row.monthly_rent) : null,
    securityDeposit:
      row.security_deposit != null ? Number(row.security_deposit) : null,
    petName: row.pet_name ?? null,
    petType: row.pet_type ?? null,
  };
}

export type TenantPropertyGroup = {
  propertyId: string;
  propertyAddress: string;
  units: TenantUnitGroup[];
};

export type TenantUnitGroup = {
  unitLabel: string;
  tenants: Tenant[];
};

/** Group tenants by property, then apartment/unit label. */
export function groupTenantsByPropertyAndUnit(
  tenants: Tenant[],
  properties: { id: string; formattedAddress: string; units: { unitLabel: string }[] }[],
): TenantPropertyGroup[] {
  const propertyOrder = new Map(
    properties.map((property, index) => [property.id, index]),
  );

  const byProperty = new Map<string, Tenant[]>();

  for (const tenant of tenants) {
    const list = byProperty.get(tenant.propertyId) ?? [];
    list.push(tenant);
    byProperty.set(tenant.propertyId, list);
  }

  const groups: TenantPropertyGroup[] = [];

  for (const [propertyId, propertyTenants] of byProperty) {
    const property = properties.find((p) => p.id === propertyId);
    const address =
      property?.formattedAddress ?? propertyTenants[0]?.propertyAddress ?? "Property";

    const unitKeys = new Set<string>();
    if (property) {
      for (const unit of property.units) {
        unitKeys.add(unit.unitLabel);
      }
    }
    for (const tenant of propertyTenants) {
      unitKeys.add(tenant.unitLabel?.trim() || "— No unit");
    }

    const sortedUnits = [...unitKeys].sort((a, b) => {
      if (a === "— No unit") return 1;
      if (b === "— No unit") return -1;
      return a.localeCompare(b, undefined, { numeric: true });
    });

    const units: TenantUnitGroup[] = sortedUnits.map((unitLabel) => ({
      unitLabel,
      tenants: propertyTenants
        .filter((tenant) => {
          const label = tenant.unitLabel?.trim() || "— No unit";
          return label === unitLabel;
        })
        .sort((a, b) => a.name.localeCompare(b.name)),
    }));

    groups.push({ propertyId, propertyAddress: address, units });
  }

  groups.sort((a, b) => {
    const orderA = propertyOrder.get(a.propertyId) ?? 999;
    const orderB = propertyOrder.get(b.propertyId) ?? 999;
    if (orderA !== orderB) return orderA - orderB;
    return a.propertyAddress.localeCompare(b.propertyAddress);
  });

  return groups;
}

export function daysUntil(isoDate: string) {
  const end = new Date(isoDate + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffMs = end.getTime() - today.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export function addDaysIso(days: number, from = new Date()) {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
