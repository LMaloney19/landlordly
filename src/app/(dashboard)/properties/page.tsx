import { PropertiesPage } from "@/components/properties/properties-page";
import { rowToMaintenance, type MaintenanceRow } from "@/lib/maintenance";
import { PROPERTY_ADDRESS_SELECT, PROPERTY_WITH_UNITS_SELECT, rowToProperty, type PropertyRow } from "@/lib/properties";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export default async function PropertiesRoute() {
  if (!isSupabaseConfigured()) {
    return (
      <PropertiesPage
        initialProperties={[]}
        initialResolvedMaintenance={[]}
        loadError="Supabase is not configured. Add keys to .env.local."
      />
    );
  }

  const supabase = await createClient();

  const [propertiesResult, maintenanceResult] = await Promise.all([
    supabase
      .from("properties")
      .select(PROPERTY_WITH_UNITS_SELECT)
      .order("created_at", { ascending: false }),
    supabase
      .from("maintenance_requests")
      .select(`*, properties(${PROPERTY_ADDRESS_SELECT})`)
      .eq("status", "resolved")
      .order("resolved_at", { ascending: false }),
  ]);

  const { data, error } = propertiesResult;

  if (error) {
    return (
      <PropertiesPage
        initialProperties={[]}
        initialResolvedMaintenance={[]}
        loadError={
          error.message.includes("relation")
            ? "Properties table not found. Run the SQL migration in Supabase."
            : error.message.includes("bedrooms")
              ? "Run supabase/migrations/20250515800000_unit_bedrooms.sql in the Supabase SQL editor."
              : error.message
        }
      />
    );
  }

  return (
    <PropertiesPage
      initialProperties={(data as PropertyRow[])
        .filter((property) => !property.archived_at)
        .map(rowToProperty)}
      initialResolvedMaintenance={
        maintenanceResult.data
          ? (maintenanceResult.data as MaintenanceRow[]).map(rowToMaintenance)
          : []
      }
      loadError={null}
    />
  );
}
