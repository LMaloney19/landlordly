"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { DocumentUploadForm } from "@/components/documents/document-upload-form";
import { DocumentsGroupedList } from "@/components/documents/documents-grouped-list";
import { groupDocumentsByPropertyUnitTenant } from "@/lib/documents";
import type { Document, Property, Tenant } from "@/types";

type DocumentsPageProps = {
  properties: Property[];
  tenants: Tenant[];
  initialDocuments: Document[];
  loadError?: string;
};

export function DocumentsPageClient({
  properties,
  tenants,
  initialDocuments,
  loadError,
}: DocumentsPageProps) {
  const [documents, setDocuments] = useState<Document[]>(initialDocuments);

  const groups = useMemo(
    () => groupDocumentsByPropertyUnitTenant(documents, properties, tenants),
    [documents, properties, tenants],
  );

  return (
    <>
      <PageHeader
        title="Documents"
        description="Leases, receipts, and inspections organized by property, unit, and tenant."
      />

      {loadError ? (
        <p
          className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
          role="alert"
        >
          {loadError}
        </p>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[minmax(0,360px)_1fr]">
        <DocumentUploadForm
          properties={properties}
          tenants={tenants}
          onUploaded={(doc) => setDocuments((current) => [doc, ...current])}
        />
        <DocumentsGroupedList
          groups={groups}
          collapseKey={String(documents.length)}
          onDeleted={(id) =>
            setDocuments((current) => current.filter((d) => d.id !== id))
          }
        />
      </section>
    </>
  );
}
