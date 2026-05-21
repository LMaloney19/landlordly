import { RentPageClient } from "@/components/rent/rent-page";
import { PROPERTY_ADDRESS_SELECT, PROPERTY_WITH_UNITS_SELECT, rowToProperty, type PropertyRow } from "@/lib/properties";
import { rowToRentPayment, type RentPaymentRow } from "@/lib/rent-payments";
import { createPageClient } from "@/lib/supabase/page";

export const dynamic = "force-dynamic";

function migrationHint(error: string) {
  if (error.includes("rent_payments") || error.includes("relation")) {
    return "Rent payments table not found. Run supabase/migrations/20250515100000_rent_payments.sql in the SQL Editor.";
  }
  return error;
}

export default async function RentPage() {
  const page = await createPageClient();

  if (!page.configured) {
    return (
      <RentPageClient
        properties={[]}
        initialPayments={[]}
        loadError="Supabase is not configured. Add keys to .env.local."
      />
    );
  }

  const { supabase } = page;

  const { data: propertiesData, error: propertiesError } = await supabase
    .from("properties")
    .select(PROPERTY_WITH_UNITS_SELECT)
    .order("created_at", { ascending: false });

  const { data: paymentsData, error: paymentsError } = await supabase
    .from("rent_payments")
    .select(`*, properties(${PROPERTY_ADDRESS_SELECT})`)
    .order("paid_at", { ascending: false })
    .order("created_at", { ascending: false });

  const loadError = propertiesError
    ? propertiesError.message
    : paymentsError
      ? migrationHint(paymentsError.message)
      : undefined;

  return (
    <RentPageClient
      properties={
        propertiesData
          ? (propertiesData as PropertyRow[]).map(rowToProperty)
          : []
      }
      initialPayments={
        paymentsData
          ? (paymentsData as RentPaymentRow[]).map(rowToRentPayment)
          : []
      }
      loadError={loadError}
    />
  );
}
