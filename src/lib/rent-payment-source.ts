import type { RentPaymentSource } from "@/types";

export const RENT_PAYMENT_SOURCE_LABELS: Record<RentPaymentSource, string> = {
  landlord: "Recorded by landlord",
  tenant_portal: "Reported by tenant",
  stripe: "Paid online",
};

export function rentPaymentSourceLabel(source?: RentPaymentSource | null) {
  if (!source) return null;
  return RENT_PAYMENT_SOURCE_LABELS[source] ?? source;
}
