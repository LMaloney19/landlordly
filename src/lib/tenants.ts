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
  };
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
