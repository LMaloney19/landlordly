"use client";

import { useTransition } from "react";
import {
  deleteDocument,
  getDocumentDownloadUrl,
} from "@/app/actions/documents";
import { CATEGORY_LABELS, formatFileSize } from "@/lib/documents";
import type { Document } from "@/types";

type DocumentListProps = {
  documents: Document[];
  onDeleted: (id: string) => void;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function DocumentList({ documents, onDeleted }: DocumentListProps) {
  const [isPending, startTransition] = useTransition();

  function handleDownload(filePath: string) {
    startTransition(async () => {
      const result = await getDocumentDownloadUrl(filePath);
      if (result.success) {
        window.open(result.data, "_blank", "noopener,noreferrer");
      }
    });
  }

  function handleDelete(id: string) {
    if (
      !confirm(
        "Archive this document?\n\nThe file will stay in storage and can be restored later.",
      )
    ) {
      return;
    }

    startTransition(async () => {
      const result = await deleteDocument(id);
      if (result.success) {
        onDeleted(id);
      }
    });
  }

  if (documents.length === 0) {
    return (
      <section className="rounded-lg border border-dashed border-zinc-300 bg-white p-12 text-center shadow-sm">
        <p className="text-sm font-medium text-zinc-900">No documents yet</p>
        <p className="mt-2 text-sm text-zinc-500">
          Upload leases, receipts, or inspection reports.
        </p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
      <header className="border-b border-zinc-200 px-6 py-4">
        <h2 className="text-sm font-semibold text-zinc-900">All documents</h2>
        <p className="mt-0.5 text-sm text-zinc-500">
          {documents.length} {documents.length === 1 ? "file" : "files"}
        </p>
      </header>
      <ul className="divide-y divide-zinc-100">
        {documents.map((doc) => (
          <li
            key={doc.id}
            className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <section className="min-w-0">
              <p className="truncate text-sm font-medium text-zinc-900">
                {doc.name}
              </p>
              <p className="mt-0.5 text-sm text-zinc-500">
                {CATEGORY_LABELS[doc.category]}
                {doc.propertyAddress ? ` · ${doc.propertyAddress}` : ""}
                {" · "}
                {formatFileSize(doc.sizeBytes)} · {formatDate(doc.createdAt)}
              </p>
            </section>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleDownload(doc.filePath)}
                className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-60"
              >
                Download
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleDelete(doc.id)}
                className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60"
              >
                Archive
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
