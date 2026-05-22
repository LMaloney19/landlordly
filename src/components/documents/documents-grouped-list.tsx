"use client";

import {
  Building2,
  ChevronDown,
  DoorOpen,
  FileText,
  Pencil,
  Trash2,
  User,
} from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import {
  deleteDocument,
  getDocumentDownloadUrl,
} from "@/app/actions/documents";
import {
  documentCategoryLabel,
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
  onEdit: (document: Document) => void;
  onDeleted: (id: string) => void;
  isPending?: boolean;
  /** When true, omit outer card chrome (parent provides header/filters). */
  embedded?: boolean;
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
  onEdit,
  onDeleted,
  disabled,
}: {
  doc: Document;
  onEdit: (document: Document) => void;
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
              {documentCategoryLabel(doc.category, doc.categoryOther)}
            </span>
            <span>
              {formatFileSize(doc.sizeBytes)} · {formatDate(doc.createdAt)}
            </span>
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          disabled={disabled || isPending}
          onClick={(event) => {
            event.stopPropagation();
            onEdit(doc);
          }}
          className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 disabled:opacity-50"
          aria-label={`Edit ${doc.name}`}
        >
          <Pencil className="h-4 w-4" />
        </button>
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
          className="rounded-md p-1.5 text-zinc-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
          aria-label={`Archive ${doc.name}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
}

function TenantSection({
  group,
  onEdit,
  onDeleted,
  isPending,
}: {
  group: DocumentTenantGroup;
  onEdit: (document: Document) => void;
  onDeleted: (id: string) => void;
  isPending: boolean;
}) {
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
            <DocumentRow
              doc={doc}
              onEdit={onEdit}
              onDeleted={onDeleted}
              disabled={isPending}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function unitExpandKey(propertyId: string, unitLabel: string) {
  return `${propertyId}::${unitLabel}`;
}

function UnitSection({
  unit,
  isExpanded,
  onToggle,
  onEdit,
  onDeleted,
  isPending,
}: {
  unit: DocumentUnitGroup;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: (document: Document) => void;
  onDeleted: (id: string) => void;
  isPending: boolean;
}) {
  const isWholeProperty = unit.unitLabel === DOCUMENT_WHOLE_PROPERTY_LABEL;
  const tenantCount = unit.tenants.length;

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50/50">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        className="flex w-full items-center justify-between gap-3 border-b border-zinc-200 bg-white px-4 py-3 text-left transition-colors hover:bg-zinc-50/80"
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
              isWholeProperty
                ? "bg-zinc-100 text-zinc-500"
                : "bg-white text-zinc-700 ring-1 ring-zinc-200",
            )}
          >
            <DoorOpen className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
              {isWholeProperty ? "Property-wide" : "Apartment / unit"}
            </p>
            <p className="text-sm font-semibold text-zinc-900">
              {formatDocumentUnitTitle(unit.unitLabel)}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
                {tenantCount} tenant{tenantCount === 1 ? "" : "s"}
              </span>
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
                {unit.documentCount} file{unit.documentCount === 1 ? "" : "s"}
              </span>
            </div>
          </div>
        </div>
        <ChevronDown
          className={cn(
            "h-5 w-5 shrink-0 text-zinc-400 transition-transform",
            isExpanded && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      {isExpanded ? (
        <div className="space-y-3 p-3">
          {unit.tenants.map((tenant) => (
            <TenantSection
              key={tenant.tenantKey}
              group={tenant}
              onEdit={onEdit}
              onDeleted={onDeleted}
              isPending={isPending}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function DocumentsGroupedList({
  groups,
  collapseKey = "",
  onEdit,
  onDeleted,
  isPending = false,
  embedded = false,
}: DocumentsGroupedListProps) {
  const [expandedPropertyIds, setExpandedPropertyIds] = useState<Set<string>>(
    new Set(),
  );
  const [expandedUnitKeys, setExpandedUnitKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    setExpandedPropertyIds(new Set());
    setExpandedUnitKeys(new Set());
  }, [collapseKey]);

  function toggleProperty(propertyId: string) {
    setExpandedPropertyIds((current) => {
      const next = new Set(current);
      if (next.has(propertyId)) {
        next.delete(propertyId);
      } else {
        next.add(propertyId);
      }
      return next;
    });
  }

  function toggleUnit(propertyId: string, unitLabel: string) {
    const key = unitExpandKey(propertyId, unitLabel);
    setExpandedUnitKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function expandAll() {
    setExpandedPropertyIds(new Set(groups.map((group) => group.propertyId)));
    setExpandedUnitKeys(
      new Set(
        groups.flatMap((group) =>
          group.units.map((unit) => unitExpandKey(group.propertyId, unit.unitLabel)),
        ),
      ),
    );
  }

  function collapseAll() {
    setExpandedPropertyIds(new Set());
    setExpandedUnitKeys(new Set());
  }

  const allUnits = groups.flatMap((group) =>
    group.units.map((unit) => unitExpandKey(group.propertyId, unit.unitLabel)),
  );

  if (groups.length === 0) {
    if (embedded) return null;
    return (
      <section className="rounded-lg border border-dashed border-zinc-300 bg-white p-12 text-center shadow-sm">
        <p className="text-sm font-medium text-zinc-900">No documents yet</p>
        <p className="mt-2 text-sm text-zinc-500">
          Upload leases, receipts, or inspection reports.
        </p>
      </section>
    );
  }

  const allPropertiesExpanded =
    groups.length > 0 &&
    groups.every((group) => expandedPropertyIds.has(group.propertyId));
  const allUnitsExpanded =
    allUnits.length > 0 && allUnits.every((key) => expandedUnitKeys.has(key));
  const allExpanded = allPropertiesExpanded && allUnitsExpanded;
  const anyExpanded =
    expandedPropertyIds.size > 0 || expandedUnitKeys.size > 0;

  const listBody = (
    <div className="p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-zinc-500">
          Expand a property, then a unit, to see tenants and files.
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
            disabled={!anyExpanded}
            className="rounded-md border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-40"
          >
            Collapse all
          </button>
        </div>
      </div>

      <ul className="space-y-3">
        {groups.map((property) => {
          const isPropertyExpanded = expandedPropertyIds.has(property.propertyId);

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
                    isPropertyExpanded && "rotate-180",
                  )}
                  aria-hidden
                />
              </button>

              {isPropertyExpanded ? (
                <div className="space-y-3 border-t border-zinc-100 bg-zinc-50/40 px-4 py-4 sm:px-5">
                  {property.units.map((unit) => {
                    const unitKey = unitExpandKey(property.propertyId, unit.unitLabel);
                    return (
                      <UnitSection
                        key={unitKey}
                        unit={unit}
                        isExpanded={expandedUnitKeys.has(unitKey)}
                        onToggle={() =>
                          toggleUnit(property.propertyId, unit.unitLabel)
                        }
                        onEdit={onEdit}
                        onDeleted={onDeleted}
                        isPending={isPending}
                      />
                    );
                  })}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );

  if (embedded) {
    return listBody;
  }

  return (
    <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
      <header className="border-b border-zinc-200 px-6 py-4">
        <h2 className="text-sm font-semibold text-zinc-900">Your documents</h2>
        <p className="mt-0.5 text-sm text-zinc-500">
          Grouped by property, unit, and tenant
        </p>
      </header>
      {listBody}
    </section>
  );
}
