import {
  formatAddressFromJoin,
  type PropertyAddressFields,
} from "@/lib/properties";
import type { Document, DocumentCategory } from "@/types";

export const DOCUMENT_BUCKET = "documents";

export const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  lease: "Lease",
  receipt: "Receipt",
  inspection: "Inspection",
  other: "Other",
};

export type DocumentRow = {
  id: string;
  user_id: string;
  property_id: string | null;
  name: string;
  file_path: string;
  category: DocumentCategory;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
  archived_at?: string | null;
  properties: PropertyAddressFields | PropertyAddressFields[] | null;
};

export function rowToDocument(row: DocumentRow): Document {
  const joined = row.properties;
  const propertyAddress = joined
    ? formatAddressFromJoin(joined)
    : null;

  return {
    id: row.id,
    propertyId: row.property_id,
    propertyAddress: propertyAddress === "Unknown property" ? null : propertyAddress,
    name: row.name,
    filePath: row.file_path,
    category: row.category,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes != null ? Number(row.size_bytes) : null,
    createdAt: row.created_at,
  };
}

export function formatFileSize(bytes: number | null) {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function buildStoragePath(userId: string, documentId: string, fileName: string) {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${userId}/${documentId}/${safeName}`;
}
