"use client";

import {
  Building2,
  ChevronDown,
  DoorOpen,
  FileText,
  User,
} from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import {
  deleteDocument,
  getDocumentDownloadUrl,
} from "@/app/actions/documents";
import {
  CATEGORY_LABELS,
  DOCUMENT_WHOLE_PROPERTY_LABEL,
  formatDocumentUnitTitle,
  formatFileSize,
  type DocumentPropertyGroup,
  type DocumentTenantGroup,
  type DocumentUnitGroup,
} from "@/lib/documents";
import { cn } from "@/lib/utils";
import type { Document } from "@/types";

type DocumentsGroupedListProps = {
  groups: DocumentPropertyGroup[];
  collapseKey?: string;
  onDeleted: (id: string) => void;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function categoryBadgeClass(category: Document["category"]) {
  switch (category) {
    case "lease":
      return "bg-blue-50 text-blue-800 ring-blue-100";
    case "receipt":
      return "bg-emerald-50 text-emerald-800 ring-emerald-100";
    case "inspection":
      return "bg-amber-50 text-amber-800 ring-amber-100";
    default:
      return "bg-zinc-100 text-zinc-700 ring-zinc-200";
  }
}

function DocumentRow({
  doc,
  onDeleted,
  disabled,
}: {
  doc: Document;
  onDeleted: (id: string) => void;
  disabled: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function handleDownload() {
    startTransition(async () => {
      const result = await getDocumentDownloadUrl(doc.filePath);
      if (result.success) {
        window.open(result.data, "_blank", "noopener,noreferrer");
      }
    });
  }

  function handleDelete() {
    if (
      !confirm(
        "Archive this document?\n\nThe file will stay in storage and can be restored later.",
      )
    ) {
      return;
    }

    startTransition(async () => {
      const result = await deleteDocument(doc.id);
      if (result.success) {
        onDeleted(doc.id);
      }
    });
  }

  return (
    <article className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600">
          <FileText className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-zinc-900">{doc.name}</p>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
            <span
              className={cn(
                "rounded-full px-2 py-0.5 font-semibold ring-1",
                categoryBadgeClass(doc.category),
              )}
            >
              {CATEGORY_LABELS[doc.category]}
            </span>
            <span>
              {formatFileSize(doc.sizeBytes)} · {formatDate(doc.createdAt)}
            </span>
          </p>
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          disabled={disabled || isPending}
          onClick={handleDownload}
          className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-60"
        >
          Download
        </button>
        <button
          type="button"
          disabled={disabled || isPending}
          onClick={handleDelete}
          className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60"
        >
          Archive
        </button>
      </div>
    </article>
  );
}

function TenantSection({ group, onDeleted }: { group: DocumentTenantGroup; onDeleted: (id: string) => void }) {
  return (
    <div className="rounded-lg border border-zinc-200/80 bg-white">
      <div className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600">
          <User className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
            Tenant
          </p>
          <p className="text-sm font-semibold text-zinc-900">{group.tenantName}</p>
        </div>
        <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700">
          {group.documents.length} file{group.documents.length === 1 ? "" : "s"}
        </span>
      </div>
      <ul className="space-y-3 p-3">
        {group.documents.map((doc) => (
          <li key={doc.id}>
            <DocumentRow doc={doc} onDeleted={onDeleted} disabled={false} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function UnitSection({
  unit,
  onDeleted,
}: {
  unit: DocumentUnitGroup;
  onDeleted: (id: string) => void;
}) {
  const isWholeProperty = unit.unitLabel === DOCUMENT_WHOLE_PROPERTY_LABEL;

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50/50">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg",
              isWholeProperty
                ? "bg-zinc-100 text-zinc-500"
                : "bg-white text-zinc-700 ring-1 ring-zinc-200",
            )}
          >
            <DoorOpen className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
              {isWholeProperty ? "Property-wide" : "Apartment / unit"}
            </p>
            <p className="text-sm font-semibold text-zinc-900">
              {formatDocumentUnitTitle(unit.unitLabel)}
            </p>
          </div>
        </div>
        <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700">
          {unit.documentCount} file{unit.documentCount === 1 ? "" : "s"}
        </span>
      </div>
      <div className="space-y-3 p-3">
        {unit.tenants.map((tenant) => (
          <TenantSection
            key={tenant.tenantKey}
            group={tenant}
            onDeleted={onDeleted}
          />
        ))}
      </div>
    </div>
  );
}

export function DocumentsGroupedList({
  groups,
  collapseKey = "",
  onDeleted,
}: DocumentsGroupedListProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setExpandedIds(new Set());
  }, [collapseKey]);

  function toggleProperty(propertyId: string) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(propertyId)) {
        next.delete(propertyId);
      } else {
        next.add(propertyId);
      }
      return next;
    });
  }

  function expandAll() {
    setExpandedIds(new Set(groups.map((group) => group.propertyId)));
  }

  function collapseAll() {
    setExpandedIds(new Set());
  }

  if (groups.length === 0) {
    return (
      <section className="rounded-lg border border-dashed border-zinc-300 bg-white p-12 text-center shadow-sm">
        <p className="text-sm font-medium text-zinc-900">No documents yet</p>
        <p className="mt-2 text-sm text-zinc-500">
          Upload leases, receipts, or inspection reports.
        </p>
      </section>
    );
  }

  const allExpanded =
    groups.length > 0 && groups.every((group) => expandedIds.has(group.propertyId));

  return (
    <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
      <header className="border-b border-zinc-200 px-6 py-4">
        <h2 className="text-sm font-semibold text-zinc-900">Your documents</h2>
        <p className="mt-0.5 text-sm text-zinc-500">
          Grouped by property, unit, and tenant
        </p>
      </header>

      <div className="p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-zinc-500">
            Expand a property to see units, tenants, and files.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={expandAll}
              disabled={allExpanded}
              className="rounded-md border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-40"
            >
              Expand all
            </button>
            <button
              type="button"
              onClick={collapseAll}
              disabled={expandedIds.size === 0}
              className="rounded-md border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-40"
            >
              Collapse all
            </button>
          </div>
        </div>

        <ul className="space-y-3">
          {groups.map((property) => {
            const isExpanded = expandedIds.has(property.propertyId);

            return (
              <li
                key={property.propertyId}
                className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => toggleProperty(property.propertyId)}
                  className="flex w-full items-start gap-4 px-4 py-4 text-left transition-colors hover:bg-zinc-50/80 sm:px-5"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white">
                    <Building2 className="h-5 w-5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                      Property
                    </p>
                    <p className="mt-0.5 text-base font-semibold text-zinc-900">
                      {property.propertyAddress}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700">
                        {property.units.length} unit
                        {property.units.length === 1 ? "" : "s"}
                      </span>
                      <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700">
                        {property.documentCount} file
                        {property.documentCount === 1 ? "" : "s"}
                      </span>
                    </div>
                  </div>
                  <ChevronDown
                    className={cn(
                      "mt-2 h-5 w-5 shrink-0 text-zinc-400 transition-transform",
                      isExpanded && "rotate-180",
                    )}
                    aria-hidden
                  />
                </button>

                {isExpanded ? (
                  <div className="space-y-3 border-t border-zinc-100 bg-zinc-50/40 px-4 py-4 sm:px-5">
                    {property.units.map((unit) => (
                      <UnitSection
                        key={`${property.propertyId}-${unit.unitLabel}`}
                        unit={unit}
                        onDeleted={onDeleted}
                      />
                    ))}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
