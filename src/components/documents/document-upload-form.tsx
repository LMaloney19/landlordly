"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { saveDocument } from "@/app/actions/documents";
import { createClient } from "@/lib/supabase/client";
import { signedOutSaveMessage } from "@/lib/dev-bypass";
import { DocumentCategoryFields } from "@/components/documents/document-category-fields";
import {
  buildStoragePath,
  categoryOtherValidationError,
  DOCUMENT_BUCKET,
  DOCUMENT_WHOLE_PROPERTY_LABEL,
  normalizeCategoryOther,
} from "@/lib/documents";
import type { Document, DocumentCategory, Property, Tenant } from "@/types";

type DocumentUploadFormProps = {
  properties: Property[];
  tenants: Tenant[];
  onUploaded: (document: Document) => void;
};

export function DocumentUploadForm({
  properties,
  tenants,
  onUploaded,
}: DocumentUploadFormProps) {
  const [propertyId, setPropertyId] = useState("");
  const [unitLabel, setUnitLabel] = useState(DOCUMENT_WHOLE_PROPERTY_LABEL);
  const [tenantId, setTenantId] = useState("");
  const [category, setCategory] = useState<DocumentCategory>("lease");
  const [categoryOther, setCategoryOther] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedProperty = properties.find((property) => property.id === propertyId);

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
    if (!propertyId) return [];
    const atProperty = tenants.filter((tenant) => tenant.propertyId === propertyId);
    if (unitLabel === DOCUMENT_WHOLE_PROPERTY_LABEL) {
      return atProperty;
    }
    return atProperty.filter(
      (tenant) => (tenant.unitLabel?.trim() || "") === unitLabel,
    );
  }, [propertyId, unitLabel, tenants]);

  function handlePropertyChange(nextPropertyId: string) {
    setPropertyId(nextPropertyId);
    setUnitLabel(DOCUMENT_WHOLE_PROPERTY_LABEL);
    setTenantId("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!file) {
      setError("Choose a file to upload.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("File must be 10 MB or smaller.");
      return;
    }

    const normalizedOther = normalizeCategoryOther(category, categoryOther);
    const categoryError = categoryOtherValidationError(category, normalizedOther);
    if (categoryError) {
      setError(categoryError);
      return;
    }

    startTransition(async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError(signedOutSaveMessage());
        return;
      }

      const documentId = crypto.randomUUID();
      const filePath = buildStoragePath(user.id, documentId, file.name);

      const { error: uploadError } = await supabase.storage
        .from(DOCUMENT_BUCKET)
        .upload(filePath, file, { upsert: false });

      if (uploadError) {
        setError(uploadError.message);
        return;
      }

      const resolvedUnit =
        unitLabel === DOCUMENT_WHOLE_PROPERTY_LABEL ? undefined : unitLabel;

      const result = await saveDocument({
        propertyId: propertyId || undefined,
        unitLabel: propertyId ? resolvedUnit : undefined,
        tenantId: tenantId || undefined,
        name: file.name,
        filePath,
        category,
        categoryOther: normalizedOther ?? undefined,
        mimeType: file.type || undefined,
        sizeBytes: file.size,
      });

      if (!result.success) {
        setError(`${result.error} The uploaded file was left in storage.`);
        return;
      }

      onUploaded(result.data);
      setFile(null);
      setPropertyId("");
      setUnitLabel(DOCUMENT_WHOLE_PROPERTY_LABEL);
      setTenantId("");
      setCategory("lease");
      setCategoryOther("");
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm"
    >
      <h2 className="text-sm font-semibold text-zinc-900">Upload document</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Leases, receipts, and inspection reports (max 10 MB).
      </p>

      <fieldset className="mt-6 space-y-4" disabled={isPending}>
        <label className="block">
          <span className="text-sm font-medium text-zinc-700">File</span>
          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="mt-1.5 block w-full text-sm text-zinc-600 file:mr-4 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-zinc-900"
          />
        </label>

        <DocumentCategoryFields
          category={category}
          categoryOther={categoryOther}
          disabled={isPending}
          onCategoryChange={setCategory}
          onCategoryOtherChange={setCategoryOther}
        />

        <label className="block">
          <span className="text-sm font-medium text-zinc-700">
            Property (optional)
          </span>
          <select
            value={propertyId}
            onChange={(e) => handlePropertyChange(e.target.value)}
            className="mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200"
          >
            <option value="">No property</option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.formattedAddress}
              </option>
            ))}
          </select>
        </label>

        {propertyId ? (
          <>
            <label className="block">
              <span className="text-sm font-medium text-zinc-700">Unit</span>
              <select
                value={unitLabel}
                onChange={(e) => {
                  setUnitLabel(e.target.value);
                  setTenantId("");
                }}
                className="mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200"
              >
                {unitOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-zinc-700">
                Tenant (optional)
              </span>
              <select
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200"
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

      <button
        type="submit"
        disabled={isPending || !file}
        className="mt-6 w-full rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-60"
      >
        {isPending ? "Uploading…" : "Upload"}
      </button>
    </form>
  );
}
