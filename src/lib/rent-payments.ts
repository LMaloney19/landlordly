import {
  formatAddressFromJoin,
  type PropertyAddressFields,
} from "@/lib/properties";
import type { RentPayment } from "@/types";

export type RentPaymentRow = {
  id: string;
  user_id: string;
  property_id: string;
  amount: number;
  paid_at: string;
  notes: string | null;
  created_at: string;
  properties: PropertyAddressFields | PropertyAddressFields[] | null;
};

export function rowToRentPayment(row: RentPaymentRow): RentPayment {
  return {
    id: row.id,
    propertyId: row.property_id,
    propertyAddress: formatAddressFromJoin(row.properties),
    amount: Number(row.amount),
    paidAt: row.paid_at,
    notes: row.notes,
  };
}

export function startOfMonthIso(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
}

export function endOfMonthIso(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
    .toISOString()
    .slice(0, 10);
}
