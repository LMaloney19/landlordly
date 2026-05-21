"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { DocumentUploadForm } from "@/components/documents/document-upload-form";
import { DocumentList } from "@/components/documents/document-list";
import type { Document, Property } from "@/types";

type DocumentsPageProps = {
  properties: Property[];
  initialDocuments: Document[];
  loadError?: string;
};

export function DocumentsPageClient({
  properties,
  initialDocuments,
  loadError,
}: DocumentsPageProps) {
  const [documents, setDocuments] = useState<Document[]>(initialDocuments);

  return (
    <>
      <PageHeader
        title="Documents"
        description="Store leases, inspection reports, and receipts in one place."
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
          onUploaded={(doc) => setDocuments((current) => [doc, ...current])}
        />
        <DocumentList
          documents={documents}
          onDeleted={(id) =>
            setDocuments((current) => current.filter((d) => d.id !== id))
          }
        />
      </section>
    </>
  );
}
