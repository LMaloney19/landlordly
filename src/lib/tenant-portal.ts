import { formatAddressFromJoin, type PropertyAddressFields } from "@/lib/properties";
import { normalizeRentDueDay } from "@/lib/rent-status";
import type { Tenant } from "@/types";

export type TenantRowWithPortal = {
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
  rent_due_day?: number | null;
  portal_auth_user_id?: string | null;
  portal_linked_at?: string | null;
  properties: PropertyAddressFields | PropertyAddressFields[] | null;
};

export function rowToPortalTenant(row: TenantRowWithPortal): Tenant & {
  landlordUserId: string;
  portalLinked: boolean;
  portalLinkedAt: string | null;
} {
  return {
    id: row.id,
    landlordUserId: row.user_id,
    propertyId: row.property_id,
    propertyAddress: formatAddressFromJoin(row.properties),
    name: row.name,
    email: row.email,
    phone: row.phone,
    unitLabel: row.unit_label,
    leaseStart: row.lease_start,
    leaseEnd: row.lease_end,
    monthlyRent: row.monthly_rent != null ? Number(row.monthly_rent) : null,
    rentDueDay: normalizeRentDueDay(row.rent_due_day),
    securityDeposit: null,
    petType: null,
    portalLinked: Boolean(row.portal_auth_user_id),
    portalLinkedAt: row.portal_linked_at ?? null,
  };
}

export const TENANT_SELECT_PORTAL = `*, properties(address_line1, address_line2, city, state, postal_code, country)`;
