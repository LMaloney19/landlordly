import { EXPENSE_WHOLE_PROPERTY_LABEL } from "@/lib/expenses";
import {
  formatAddressFromJoin,
  type PropertyAddressFields,
} from "@/lib/properties";
import type { Document, DocumentCategory, Tenant } from "@/types";

export const DOCUMENT_BUCKET = "documents";

/** Reuse expense whole-property label for documents without a unit. */
export const DOCUMENT_WHOLE_PROPERTY_LABEL = EXPENSE_WHOLE_PROPERTY_LABEL;

/** Documents not tied to a specific tenant. */
export const DOCUMENT_SHARED_TENANT_KEY = "__shared__";

export const DOCUMENT_UNASSIGNED_PROPERTY_ID = "__unassigned__";

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
  unit_label?: string | null;
  tenant_id?: string | null;
  name: string;
  file_path: string;
  category: DocumentCategory;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
  archived_at?: string | null;
  properties: PropertyAddressFields | PropertyAddressFields[] | null;
  tenants?: { id: string; name: string } | { id: string; name: string }[] | null;
};

function formatTenantNameFromJoin(
  joined: DocumentRow["tenants"],
): string | null {
  if (!joined) return null;
  const row = Array.isArray(joined) ? joined[0] : joined;
  return row?.name?.trim() || null;
}

export function rowToDocument(row: DocumentRow): Document {
  const joined = row.properties;
  const propertyAddress = joined
    ? formatAddressFromJoin(joined)
    : null;

  return {
    id: row.id,
    propertyId: row.property_id,
    propertyAddress: propertyAddress === "Unknown property" ? null : propertyAddress,
    unitLabel: row.unit_label?.trim() || null,
    tenantId: row.tenant_id ?? null,
    tenantName: formatTenantNameFromJoin(row.tenants),
    name: row.name,
    filePath: row.file_path,
    category: row.category,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes != null ? Number(row.size_bytes) : null,
    createdAt: row.created_at,
  };
}

export function documentUnitKey(unitLabel: string | null | undefined) {
  const trimmed = unitLabel?.trim();
  return trimmed ? trimmed : DOCUMENT_WHOLE_PROPERTY_LABEL;
}

export function formatDocumentUnitTitle(unitLabel: string) {
  if (unitLabel === DOCUMENT_WHOLE_PROPERTY_LABEL) return "Whole property";
  return `Unit ${unitLabel}`;
}

export function documentTenantKey(tenantId: string | null | undefined) {
  return tenantId ?? DOCUMENT_SHARED_TENANT_KEY;
}

export function formatDocumentTenantTitle(
  tenantKey: string,
  tenantName: string | null,
) {
  if (tenantKey === DOCUMENT_SHARED_TENANT_KEY) {
    return "Property-wide / no tenant";
  }
  return tenantName ?? "Tenant";
}

export type DocumentTenantGroup = {
  tenantKey: string;
  tenantName: string;
  documents: Document[];
};

export type DocumentUnitGroup = {
  unitLabel: string;
  documentCount: number;
  tenants: DocumentTenantGroup[];
};

export type DocumentPropertyGroup = {
  propertyId: string;
  propertyAddress: string;
  documentCount: number;
  units: DocumentUnitGroup[];
};

function sortDocuments(docs: Document[]) {
  return [...docs].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Group documents by property → unit → tenant. */
export function groupDocumentsByPropertyUnitTenant(
  documents: Document[],
  properties: { id: string; formattedAddress: string; units: { unitLabel: string }[] }[],
  tenants: Tenant[],
): DocumentPropertyGroup[] {
  const propertyOrder = new Map(
    properties.map((property, index) => [property.id, index]),
  );
  const tenantNameById = new Map(tenants.map((tenant) => [tenant.id, tenant.name]));

  const byProperty = new Map<string | null, Document[]>();

  for (const document of documents) {
    const key = document.propertyId;
    const list = byProperty.get(key) ?? [];
    list.push(document);
    byProperty.set(key, list);
  }

  const groups: DocumentPropertyGroup[] = [];

  for (const [propertyId, propertyDocuments] of byProperty) {
    const isUnassigned = propertyId == null;
    const property = propertyId
      ? properties.find((item) => item.id === propertyId)
      : undefined;
    const address = isUnassigned
      ? "Not linked to a property"
      : (property?.formattedAddress ??
        propertyDocuments[0]?.propertyAddress ??
        "Property");

    const unitKeys = new Set<string>();
    if (property) {
      for (const unit of property.units) {
        unitKeys.add(unit.unitLabel);
      }
    }
    for (const document of propertyDocuments) {
      unitKeys.add(documentUnitKey(document.unitLabel));
    }
    if (unitKeys.size === 0) {
      unitKeys.add(DOCUMENT_WHOLE_PROPERTY_LABEL);
    }

    const sortedUnits = [...unitKeys].sort((a, b) => {
      if (a === DOCUMENT_WHOLE_PROPERTY_LABEL) return -1;
      if (b === DOCUMENT_WHOLE_PROPERTY_LABEL) return 1;
      return a.localeCompare(b, undefined, { numeric: true });
    });

    const units: DocumentUnitGroup[] = sortedUnits.map((unitLabel) => {
      const unitDocuments = propertyDocuments.filter(
        (document) => documentUnitKey(document.unitLabel) === unitLabel,
      );

      const tenantKeys = new Set<string>();
      for (const document of unitDocuments) {
        tenantKeys.add(documentTenantKey(document.tenantId));
      }
      if (tenantKeys.size === 0) {
        tenantKeys.add(DOCUMENT_SHARED_TENANT_KEY);
      }

      const sortedTenantKeys = [...tenantKeys].sort((a, b) => {
        if (a === DOCUMENT_SHARED_TENANT_KEY) return -1;
        if (b === DOCUMENT_SHARED_TENANT_KEY) return 1;
        const nameA = tenantNameById.get(a) ?? "";
        const nameB = tenantNameById.get(b) ?? "";
        return nameA.localeCompare(nameB);
      });

      const tenantGroups: DocumentTenantGroup[] = sortedTenantKeys
        .map((tenantKey) => {
          const tenantDocs = sortDocuments(
            unitDocuments.filter(
              (document) => documentTenantKey(document.tenantId) === tenantKey,
            ),
          );
          const name =
            tenantKey === DOCUMENT_SHARED_TENANT_KEY
              ? formatDocumentTenantTitle(tenantKey, null)
              : (tenantNameById.get(tenantKey) ??
                tenantDocs[0]?.tenantName ??
                "Tenant");

          return {
            tenantKey,
            tenantName: name,
            documents: tenantDocs,
          };
        })
        .filter((group) => group.documents.length > 0);

      return {
        unitLabel,
        documentCount: unitDocuments.length,
        tenants: tenantGroups,
      };
    }).filter((unit) => unit.documentCount > 0);

    const documentCount = propertyDocuments.length;

    groups.push({
      propertyId: isUnassigned ? DOCUMENT_UNASSIGNED_PROPERTY_ID : propertyId!,
      propertyAddress: address,
      documentCount,
      units,
    });
  }

  groups.sort((a, b) => {
    if (a.propertyId === DOCUMENT_UNASSIGNED_PROPERTY_ID) return 1;
    if (b.propertyId === DOCUMENT_UNASSIGNED_PROPERTY_ID) return -1;
    const orderA = propertyOrder.get(a.propertyId) ?? 999;
    const orderB = propertyOrder.get(b.propertyId) ?? 999;
    if (orderA !== orderB) return orderA - orderB;
    return a.propertyAddress.localeCompare(b.propertyAddress);
  });

  return groups;
}

export function formatFileSize(bytes: number | null) {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const DOCUMENT_SELECT = `*, properties(address_line1, address_line2, city, state, postal_code, country), tenants(id, name)`;

export function buildStoragePath(userId: string, documentId: string, fileName: string) {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${userId}/${documentId}/${safeName}`;
}
