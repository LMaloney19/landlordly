import type { Property, PropertyUnit } from "@/types";

export type PropertyUnitRow = {
  id: string;
  property_id: string;
  unit_label: string;
  bedrooms?: number | null;
  monthly_rent: number;
};

export type PropertyRow = {
  id: string;
  user_id: string;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
  address?: string | null;
  units?: number | null;
  monthly_rent?: number | null;
  created_at: string;
  archived_at?: string | null;
  property_units?: PropertyUnitRow[] | null;
};

export type PropertyAddressFields = {
  address_line1: string;
  address_line2?: string | null;
  city: string;
  state: string;
  postal_code: string;
  country?: string;
};

export const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
  "DC",
] as const;

function toAddressFields(
  fields: PropertyAddressFields | Property | PropertyRow,
): PropertyAddressFields {
  if ("addressLine1" in fields && fields.addressLine1) {
    return {
      address_line1: fields.addressLine1,
      address_line2: fields.addressLine2,
      city: fields.city,
      state: fields.state,
      postal_code: fields.postalCode,
      country: fields.country,
    };
  }

  const row = fields as PropertyRow & PropertyAddressFields;

  return {
    address_line1: row.address_line1 ?? row.address ?? "Unknown address",
    address_line2: row.address_line2 ?? null,
    city: row.city ?? "",
    state: row.state ?? "",
    postal_code: row.postal_code ?? "",
    country: row.country ?? "US",
  };
}

export function formatPropertyAddress(
  fields: PropertyAddressFields | Property | PropertyRow,
  multiline = false,
): string {
  const addr = toAddressFields(fields);
  const line1 = (addr.address_line1 ?? "").trim();
  const line2 = addr.address_line2?.trim();
  const city = (addr.city ?? "").trim();
  const state = (addr.state ?? "").trim();
  const postal = (addr.postal_code ?? "").trim();

  const cityLine =
    city && state && postal
      ? `${city}, ${state} ${postal}`
      : [city, state, postal].filter(Boolean).join(" ");

  const country =
    addr.country && addr.country !== "US" ? `, ${addr.country.trim()}` : "";

  if (multiline) {
    return [line1, line2, cityLine ? `${cityLine}${country}` : null]
      .filter(Boolean)
      .join("\n");
  }

  const street = line2 ? `${line1}, ${line2}` : line1;
  return cityLine ? `${street}, ${cityLine}${country}` : street;
}

export function getPropertyAddressLines(property: Property): string[] {
  return formatPropertyAddress(property, true).split("\n").filter(Boolean);
}

function rowToPropertyUnit(row: PropertyUnitRow): PropertyUnit {
  return {
    id: row.id,
    propertyId: row.property_id,
    unitLabel: row.unit_label,
    bedrooms:
      row.bedrooms !== undefined && row.bedrooms !== null ? row.bedrooms : 1,
    monthlyRent: Number(row.monthly_rent),
  };
}

function legacyUnitsFromRow(row: PropertyRow): PropertyUnit[] {
  const count = Math.max(row.units ?? 1, 1);
  const rent = Number(row.monthly_rent ?? 0);

  return Array.from({ length: count }, (_, i) => ({
    id: `legacy-${row.id}-${i}`,
    propertyId: row.id,
    unitLabel: count === 1 ? "1" : `Unit ${i + 1}`,
    bedrooms: 1,
    monthlyRent: rent,
  }));
}

export function rowToProperty(row: PropertyRow): Property {
  const unitRows = row.property_units ?? [];
  const units =
    unitRows.length > 0
      ? unitRows.map(rowToPropertyUnit)
      : legacyUnitsFromRow(row);

  const property: Property = {
    id: row.id,
    addressLine1: row.address_line1 ?? row.address ?? "Unknown address",
    addressLine2: row.address_line2 ?? null,
    city: row.city ?? "",
    state: row.state ?? "",
    postalCode: row.postal_code ?? "",
    country: row.country ?? "US",
    formattedAddress: "",
    units,
    unitCount: units.length,
    totalMonthlyRent: units.reduce((sum, u) => sum + u.monthlyRent, 0),
  };

  property.formattedAddress = formatPropertyAddress(property);
  return property;
}

export function formatAddressFromJoin(
  property: PropertyAddressFields | PropertyAddressFields[] | null | undefined,
): string {
  if (!property) return "Unknown property";
  const row = Array.isArray(property) ? property[0] : property;
  if (!row?.address_line1 && !("address" in (row ?? {}))) return "Unknown property";
  return formatPropertyAddress(row);
}

export function formatUnitDisplay(unit: PropertyUnit, property: Property): string {
  return `${property.formattedAddress} — ${unit.unitLabel}`;
}

export const PROPERTY_ADDRESS_SELECT =
  "address_line1, address_line2, city, state, postal_code, country";

export const PROPERTY_WITH_UNITS_SELECT = `*, property_units(*)`;
