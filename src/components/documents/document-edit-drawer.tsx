"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { updateDocument } from "@/app/actions/documents";
import { DOCUMENT_WHOLE_PROPERTY_LABEL } from "@/lib/documents";
import type { Document, DocumentCategory, Property, Tenant } from "@/types";

const inputClass =
  "mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200";

type DocumentDraft = {
  name: string;
  category: DocumentCategory;
  propertyId: string;
  unitLabel: string;
  tenantId: string;
};

function draftFromDocument(document: Document): DocumentDraft {
  return {
    name: document.name,
    category: document.category,
    propertyId: document.propertyId ?? "",
    unitLabel: document.unitLabel?.trim()
      ? document.unitLabel
      : DOCUMENT_WHOLE_PROPERTY_LABEL,
    tenantId: document.tenantId ?? "",
  };
}

type DocumentEditDrawerProps = {
  document: Document;
  properties: Property[];
  tenants: Tenant[];
  onClose: () => void;
  onUpdated: (document: Document) => void;
};

export function DocumentEditDrawer({
  document,
  properties,
  tenants,
  onClose,
  onUpdated,
}: DocumentEditDrawerProps) {
  const [draft, setDraft] = useState<DocumentDraft>(() =>
    draftFromDocument(document),
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedProperty = properties.find(
    (property) => property.id === draft.propertyId,
  );

  const unitOptions = useMemo(() => {
    if (!selectedProperty) return [];
    return [
      { value: DOCUMENT_WHOLE_PROPERTY_LABEL, label: "Whole property" },
      ...selectedProperty.units.map((unit) => ({
        value: unit.unitLabel,
        label: `Unit ${unit.unitLabel}`,
      })),
    ];
  }, [selectedProperty]);

  const tenantOptions = useMemo(() => {
    if (!draft.propertyId) return [];
    const atProperty = tenants.filter(
      (tenant) => tenant.propertyId === draft.propertyId,
    );
    if (draft.unitLabel === DOCUMENT_WHOLE_PROPERTY_LABEL) {
      return atProperty;
    }
    return atProperty.filter(
      (tenant) => (tenant.unitLabel?.trim() || "") === draft.unitLabel,
    );
  }, [draft.propertyId, draft.unitLabel, tenants]);

  function updateDraft(patch: Partial<DocumentDraft>) {
    setDraft((current) => {
      const next = { ...current, ...patch };
      if (patch.propertyId !== undefined && patch.propertyId !== current.propertyId) {
        next.unitLabel = DOCUMENT_WHOLE_PROPERTY_LABEL;
        next.tenantId = "";
      }
      if (patch.unitLabel !== undefined && patch.unitLabel !== current.unitLabel) {
        next.tenantId = "";
      }
      return next;
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!draft.name.trim()) {
      setError("Document name is required.");
      return;
    }

    startTransition(async () => {
      const resolvedUnit =
        draft.unitLabel === DOCUMENT_WHOLE_PROPERTY_LABEL
          ? undefined
          : draft.unitLabel;

      const result = await updateDocument({
        id: document.id,
        name: draft.name.trim(),
        category: draft.category,
        propertyId: draft.propertyId || null,
        unitLabel: draft.propertyId ? resolvedUnit : undefined,
        tenantId: draft.tenantId || undefined,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      onUpdated(result.data);
    });
  }

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close document editor"
        className="absolute inset-0 bg-zinc-900/30"
        onClick={onClose}
      />
      <aside className="absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-xl">
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-zinc-900">
              Edit document
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Update name, category, and where it is filed. The file itself is not
              replaced.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Close
          </button>
        </header>

        <form onSubmit={handleSubmit}>
          <fieldset className="space-y-4" disabled={isPending}>
            <label className="block">
              <span className="text-sm font-medium text-zinc-700">Name</span>
              <input
                type="text"
                value={draft.name}
                onChange={(event) => updateDraft({ name: event.target.value })}
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-zinc-700">Category</span>
              <select
                value={draft.category}
                onChange={(event) =>
                  updateDraft({ category: event.target.value as DocumentCategory })
                }
                className={inputClass}
              >
                <option value="lease">Lease</option>
                <option value="receipt">Receipt</option>
                <option value="inspection">Inspection</option>
                <option value="other">Other</option>
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-zinc-700">Property</span>
              <select
                value={draft.propertyId}
                onChange={(event) => updateDraft({ propertyId: event.target.value })}
                className={inputClass}
              >
                <option value="">Not linked to a property</option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.formattedAddress}
                  </option>
                ))}
              </select>
            </label>

            {draft.propertyId ? (
              <>
                <label className="block">
                  <span className="text-sm font-medium text-zinc-700">Unit</span>
                  <select
                    value={draft.unitLabel}
                    onChange={(event) =>
                      updateDraft({ unitLabel: event.target.value })
                    }
                    className={inputClass}
                  >
                    {unitOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-zinc-700">Tenant</span>
                  <select
                    value={draft.tenantId}
                    onChange={(event) =>
                      updateDraft({ tenantId: event.target.value })
                    }
                    className={inputClass}
                  >
                    <option value="">Property-wide / no tenant</option>
                    {tenantOptions.map((tenant) => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.name}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            ) : null}
          </fieldset>

          {error ? (
            <p className="mt-4 text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}

          <div className="mt-6 flex gap-3">
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
            >
              {isPending ? "Saving…" : "Save changes"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="rounded-md border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}
