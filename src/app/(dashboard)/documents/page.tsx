import { DocumentsPageClient } from "@/components/documents/documents-page";
import { rowToDocument, type DocumentRow } from "@/lib/documents";
import {
  PROPERTY_ADDRESS_SELECT,
  PROPERTY_WITH_UNITS_SELECT,
  rowToProperty,
  type PropertyRow,
} from "@/lib/properties";
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

  const { data: documentsData, error: documentsError } = await supabase
    .from("documents")
    .select(`*, properties(${PROPERTY_ADDRESS_SELECT})`)
    .order("created_at", { ascending: false });

  const loadError = propertiesError
    ? propertiesError.message
    : documentsError
      ? migrationHint(documentsError.message)
      : undefined;

  return (
    <DocumentsPageClient
      properties={
        propertiesData
          ? (propertiesData as PropertyRow[])
              .filter((property) => !property.archived_at)
              .map(rowToProperty)
          : []
      }
      initialDocuments={
        documentsData
          ? (documentsData as DocumentRow[])
              .filter((document) => !document.archived_at)
              .map(rowToDocument)
          : []
      }
      loadError={loadError}
    />
  );
}
