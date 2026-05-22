"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { DocumentEditDrawer } from "@/components/documents/document-edit-drawer";
import { DocumentUploadForm } from "@/components/documents/document-upload-form";
import { DocumentsGroupedList } from "@/components/documents/documents-grouped-list";
import { EXPENSE_WHOLE_PROPERTY_LABEL } from "@/lib/expenses";
import {
  CATEGORY_LABELS,
  documentCategoryLabel,
  documentUnitKey,
  DOCUMENT_UNASSIGNED_PROPERTY_ID,
  groupDocumentsByPropertyUnitTenant,
} from "@/lib/documents";
import type { Document, DocumentCategory, Property, Tenant } from "@/types";

const DOCUMENT_UNASSIGNED_FILTER = DOCUMENT_UNASSIGNED_PROPERTY_ID;

const DOCUMENT_CATEGORIES: DocumentCategory[] = [
  "lease",
  "receipt",
  "inspection",
  "other",
];

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
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [unitFilter, setUnitFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState<DocumentCategory | "all">(
    "all",
  );
  const [search, setSearch] = useState("");

  const tenantNameById = useMemo(
    () => new Map(tenants.map((tenant) => [tenant.id, tenant.name])),
    [tenants],
  );

  const unitFilterOptions = useMemo(() => {
    if (propertyFilter === "all" || propertyFilter === DOCUMENT_UNASSIGNED_FILTER) {
      return [];
    }
    const property = properties.find((item) => item.id === propertyFilter);
    if (!property) return [];

    const labels = new Set<string>([EXPENSE_WHOLE_PROPERTY_LABEL]);
    for (const unit of property.units) {
      labels.add(unit.unitLabel);
    }
    for (const document of documents) {
      if (document.propertyId === propertyFilter) {
        labels.add(documentUnitKey(document.unitLabel));
      }
    }

    return [...labels].sort((a, b) => {
      if (a === EXPENSE_WHOLE_PROPERTY_LABEL) return -1;
      if (b === EXPENSE_WHOLE_PROPERTY_LABEL) return 1;
      return a.localeCompare(b, undefined, { numeric: true });
    });
  }, [documents, properties, propertyFilter]);

  useEffect(() => {
    setUnitFilter("all");
  }, [propertyFilter]);

  const filteredDocuments = useMemo(() => {
    const query = search.trim().toLowerCase();

    return documents
      .filter((document) => {
        if (propertyFilter === "all") return true;
        if (propertyFilter === DOCUMENT_UNASSIGNED_FILTER) {
          return document.propertyId == null;
        }
        return document.propertyId === propertyFilter;
      })
      .filter((document) =>
        unitFilter === "all"
          ? true
          : documentUnitKey(document.unitLabel) === unitFilter,
      )
      .filter((document) =>
        categoryFilter === "all" ? true : document.category === categoryFilter,
      )
      .filter((document) => {
        if (!query) return true;
        const categoryLabel = documentCategoryLabel(
          document.category,
          document.categoryOther,
        );
        const tenantName =
          document.tenantName ??
          (document.tenantId ? tenantNameById.get(document.tenantId) : null);
        return (
          document.name.toLowerCase().includes(query) ||
          categoryLabel.toLowerCase().includes(query) ||
          document.propertyAddress?.toLowerCase().includes(query) ||
          document.unitLabel?.toLowerCase().includes(query) ||
          tenantName?.toLowerCase().includes(query)
        );
      });
  }, [
    categoryFilter,
    documents,
    propertyFilter,
    search,
    tenantNameById,
    unitFilter,
  ]);

  const groups = useMemo(
    () =>
      groupDocumentsByPropertyUnitTenant(filteredDocuments, properties, tenants),
    [filteredDocuments, properties, tenants],
  );

  const filterCollapseKey = `${search}-${propertyFilter}-${unitFilter}-${categoryFilter}`;

  const hasUnassigned = documents.some((document) => document.propertyId == null);

  function openEditDrawer(document: Document) {
    setEditingDocument(document);
  }

  function closeEditDrawer() {
    setEditingDocument(null);
  }

  function handleUpdated(document: Document) {
    setDocuments((current) =>
      current.map((item) => (item.id === document.id ? document : item)),
    );
    closeEditDrawer();
  }

  function handleDeleted(id: string) {
    setDocuments((current) => current.filter((d) => d.id !== id));
    if (editingDocument?.id === id) {
      closeEditDrawer();
    }
  }

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

        <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
          <header className="grid gap-3 border-b border-zinc-200 px-6 py-4 lg:grid-cols-[1fr_repeat(3,minmax(0,180px))] lg:items-end">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">Your documents</h2>
              <p className="mt-0.5 text-sm text-zinc-500">
                {filteredDocuments.length} of {documents.length} files
              </p>
            </div>
            <label>
              <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Property
              </span>
              <select
                value={propertyFilter}
                onChange={(event) => setPropertyFilter(event.target.value)}
                className="mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200"
              >
                <option value="all">All properties</option>
                {hasUnassigned ? (
                  <option value={DOCUMENT_UNASSIGNED_FILTER}>
                    Not linked to a property
                  </option>
                ) : null}
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.formattedAddress}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Unit
              </span>
              <select
                value={unitFilter}
                onChange={(event) => setUnitFilter(event.target.value)}
                disabled={
                  propertyFilter === "all" ||
                  propertyFilter === DOCUMENT_UNASSIGNED_FILTER
                }
                className="mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-50"
              >
                <option value="all">
                  {propertyFilter === "all" ||
                  propertyFilter === DOCUMENT_UNASSIGNED_FILTER
                    ? "Select property first"
                    : "All units"}
                </option>
                {unitFilterOptions.map((label) => (
                  <option key={label} value={label}>
                    {label === EXPENSE_WHOLE_PROPERTY_LABEL
                      ? "Whole property"
                      : `Unit ${label}`}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Category
              </span>
              <select
                value={categoryFilter}
                onChange={(event) =>
                  setCategoryFilter(event.target.value as DocumentCategory | "all")
                }
                className="mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200"
              >
                <option value="all">All categories</option>
                {DOCUMENT_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {CATEGORY_LABELS[category]}
                  </option>
                ))}
              </select>
            </label>
          </header>

          <div className="border-b border-zinc-100 px-6 py-3">
            <label className="block">
              <span className="sr-only">Search documents</span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, category, property, unit, or tenant…"
                className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200"
              />
            </label>
          </div>

          {filteredDocuments.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm font-medium text-zinc-900">
                {documents.length === 0 ? "No documents yet" : "No documents found"}
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                {documents.length === 0
                  ? "Upload leases, receipts, or inspection reports."
                  : "Try changing filters or search."}
              </p>
            </div>
          ) : (
            <DocumentsGroupedList
              embedded
              groups={groups}
              collapseKey={filterCollapseKey}
              onEdit={openEditDrawer}
              onDeleted={handleDeleted}
            />
          )}
        </section>
      </section>

      {editingDocument ? (
        <DocumentEditDrawer
          key={editingDocument.id}
          document={editingDocument}
          properties={properties}
          tenants={tenants}
          onClose={closeEditDrawer}
          onUpdated={handleUpdated}
        />
      ) : null}
    </>
  );
}
