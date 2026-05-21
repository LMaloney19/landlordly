"use client";

import { useState, useTransition, type FormEvent } from "react";
import { saveDocument } from "@/app/actions/documents";
import { createClient } from "@/lib/supabase/client";
import { signedOutSaveMessage } from "@/lib/dev-bypass";
import {
  buildStoragePath,
  DOCUMENT_BUCKET,
} from "@/lib/documents";
import type { Document, DocumentCategory, Property } from "@/types";

type DocumentUploadFormProps = {
  properties: Property[];
  onUploaded: (document: Document) => void;
};

export function DocumentUploadForm({
  properties,
  onUploaded,
}: DocumentUploadFormProps) {
  const [propertyId, setPropertyId] = useState("");
  const [category, setCategory] = useState<DocumentCategory>("lease");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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

      const result = await saveDocument({
        propertyId: propertyId || undefined,
        name: file.name,
        filePath,
        category,
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
      setCategory("lease");
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

        <label className="block">
          <span className="text-sm font-medium text-zinc-700">Category</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as DocumentCategory)}
            className="mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200"
          >
            <option value="lease">Lease</option>
            <option value="receipt">Receipt</option>
            <option value="inspection">Inspection</option>
            <option value="other">Other</option>
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-zinc-700">
            Property (optional)
          </span>
          <select
            value={propertyId}
            onChange={(e) => setPropertyId(e.target.value)}
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
