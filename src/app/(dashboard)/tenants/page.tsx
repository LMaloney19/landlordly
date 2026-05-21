import { TenantsPageClient } from "@/components/tenants/tenants-page";
import {
  PROPERTY_ADDRESS_SELECT,
  PROPERTY_WITH_UNITS_SELECT,
  rowToProperty,
  type PropertyRow,
} from "@/lib/properties";
import { rowToTenant, type TenantRow } from "@/lib/tenants";
import { createPageClient } from "@/lib/supabase/page";

export const dynamic = "force-dynamic";

function migrationHint(error: string) {
  if (error.includes("tenants") || error.includes("relation")) {
    return "Tenants table not found. Run supabase/migrations/20250515200000_tenants.sql in the SQL Editor.";
  }
  return error;
}

export default async function TenantsPage() {
  const page = await createPageClient();

  if (!page.configured) {
    return (
      <TenantsPageClient
        properties={[]}
        initialTenants={[]}
        loadError="Supabase is not configured. Add keys to .env.local."
      />
    );
  }

  const { supabase } = page;

  const { data: propertiesData, error: propertiesError } = await supabase
    .from("properties")
    .select(PROPERTY_WITH_UNITS_SELECT)
    .order("created_at", { ascending: false });

  const { data: tenantsData, error: tenantsError } = await supabase
    .from("tenants")
    .select(`*, properties(${PROPERTY_ADDRESS_SELECT})`)
    .order("created_at", { ascending: false });

  const loadError = propertiesError
    ? propertiesError.message
    : tenantsError
      ? migrationHint(tenantsError.message)
      : undefined;

  return (
    <TenantsPageClient
      properties={
        propertiesData
          ? (propertiesData as PropertyRow[])
              .filter((property) => !property.archived_at)
              .map(rowToProperty)
          : []
      }
      initialTenants={
        tenantsData
          ? (tenantsData as TenantRow[])
              .filter((tenant) => !tenant.archived_at)
              .map(rowToTenant)
          : []
      }
      loadError={loadError}
    />
  );
}
