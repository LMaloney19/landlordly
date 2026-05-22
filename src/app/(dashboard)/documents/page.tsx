import { DocumentsPageClient } from "@/components/documents/documents-page";
import { DOCUMENT_SELECT, rowToDocument, type DocumentRow } from "@/lib/documents";
import {
  PROPERTY_WITH_UNITS_SELECT,
  rowToProperty,
  type PropertyRow,
} from "@/lib/properties";
import { rowToTenant, type TenantRow } from "@/lib/tenants";
import { createPageClient } from "@/lib/supabase/page";

export const dynamic = "force-dynamic";

function migrationHint(error: string) {
  if (error.includes("documents") || error.includes("relation")) {
    return "Documents table not found. Run supabase/migrations/20250515400000_documents.sql in the SQL Editor.";
  }
  return error;
}

export default async function DocumentsPage() {
  const page = await createPageClient();

  if (!page.configured) {
    return (
      <DocumentsPageClient
        properties={[]}
        tenants={[]}
        initialDocuments={[]}
        loadError="Supabase is not configured. Add keys to .env.local."
      />
    );
  }

  const { supabase } = page;

  const { data: propertiesData, error: propertiesError } = await supabase
    .from("properties")
    .select(PROPERTY_WITH_UNITS_SELECT)
    .order("created_at", { ascending: false });

  const [documentsResult, tenantsResult] = await Promise.all([
    supabase
      .from("documents")
      .select(DOCUMENT_SELECT)
      .order("created_at", { ascending: false }),
    supabase
      .from("tenants")
      .select(`*, properties(address_line1, address_line2, city, state, postal_code, country)`)
      .is("archived_at", null)
      .order("name", { ascending: true }),
  ]);

  const documentsError = documentsResult.error;
  const tenantsError = tenantsResult.error;

  const loadError = propertiesError
    ? propertiesError.message
    : documentsError
      ? migrationHint(documentsError.message)
      : tenantsError?.message.includes("tenants")
        ? undefined
        : tenantsError?.message;

  return (
    <DocumentsPageClient
      properties={
        propertiesData
          ? (propertiesData as PropertyRow[])
              .filter((property) => !property.archived_at)
              .map(rowToProperty)
          : []
      }
      tenants={
        tenantsResult.data && !tenantsError
          ? (tenantsResult.data as TenantRow[]).map(rowToTenant)
          : []
      }
      initialDocuments={
        documentsResult.data
          ? (documentsResult.data as DocumentRow[])
              .filter((document) => !document.archived_at)
              .map(rowToDocument)
          : []
      }
      loadError={loadError}
    />
  );
}
