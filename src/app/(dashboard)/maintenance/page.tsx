import { MaintenancePageClient } from "@/components/maintenance/maintenance-page";
import { rowToMaintenance, type MaintenanceRow } from "@/lib/maintenance";
import { PROPERTY_ADDRESS_SELECT, PROPERTY_WITH_UNITS_SELECT, rowToProperty, type PropertyRow } from "@/lib/properties";
import { createPageClient } from "@/lib/supabase/page";

export const dynamic = "force-dynamic";

function migrationHint(error: string) {
  if (error.includes("maintenance_requests") || error.includes("relation")) {
    return "Maintenance table not found. Run supabase/migrations/20250515300000_maintenance_requests.sql in the SQL Editor.";
  }
  return error;
}

export default async function MaintenancePage() {
  const page = await createPageClient();

  if (!page.configured) {
    return (
      <MaintenancePageClient
        properties={[]}
        initialRequests={[]}
        loadError="Supabase is not configured. Add keys to .env.local."
      />
    );
  }

  const { supabase } = page;

  const { data: propertiesData, error: propertiesError } = await supabase
    .from("properties")
    .select(PROPERTY_WITH_UNITS_SELECT)
    .order("created_at", { ascending: false });

  const { data: requestsData, error: requestsError } = await supabase
    .from("maintenance_requests")
    .select(`*, properties(${PROPERTY_ADDRESS_SELECT})`)
    .order("created_at", { ascending: false });

  const loadError = propertiesError
    ? propertiesError.message
    : requestsError
      ? migrationHint(requestsError.message)
      : undefined;

  return (
    <MaintenancePageClient
      properties={
        propertiesData
          ? (propertiesData as PropertyRow[]).map(rowToProperty)
          : []
      }
      initialRequests={
        requestsData
          ? (requestsData as MaintenanceRow[]).map(rowToMaintenance)
          : []
      }
      loadError={loadError}
    />
  );
}
