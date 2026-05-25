import {
  formatAddressFromJoin,
  type PropertyAddressFields,
} from "@/lib/properties";
import type { MaintenancePriority, MaintenanceRequest, MaintenanceStatus } from "@/types";

/** Maintenance without a unit rolls up under this label in the UI. */
export const MAINTENANCE_WHOLE_PROPERTY_LABEL = "— Whole property";

export type MaintenanceRow = {
  id: string;
  user_id: string;
  property_id: string;
  unit_label?: string | null;
  title: string;
  description: string | null;
  status: MaintenanceStatus;
  priority: MaintenancePriority;
  created_at: string;
  resolved_at: string | null;
  properties: PropertyAddressFields | PropertyAddressFields[] | null;
};

export function maintenanceUnitKey(unitLabel: string | null | undefined) {
  const trimmed = unitLabel?.trim();
  return trimmed ? trimmed : MAINTENANCE_WHOLE_PROPERTY_LABEL;
}

export function formatMaintenanceUnitTitle(unitLabel: string) {
  if (unitLabel === MAINTENANCE_WHOLE_PROPERTY_LABEL) return "Whole property";
  return `Unit ${unitLabel}`;
}

export function isMaintenanceActive(status: MaintenanceStatus) {
  return status === "open" || status === "in_progress";
}

export function rowToMaintenance(row: MaintenanceRow): MaintenanceRequest {
  return {
    id: row.id,
    propertyId: row.property_id,
    propertyAddress: formatAddressFromJoin(row.properties),
    unitLabel: row.unit_label?.trim() || null,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
  };
}

export type MaintenancePropertyGroup = {
  propertyId: string;
  propertyAddress: string;
  requestCount: number;
  units: MaintenanceUnitGroup[];
};

export type MaintenanceUnitGroup = {
  unitLabel: string;
  requests: MaintenanceRequest[];
};

function sortResolvedRequests(requests: MaintenanceRequest[]) {
  return [...requests].sort((a, b) => {
    const aDate = a.resolvedAt ?? a.createdAt;
    const bDate = b.resolvedAt ?? b.createdAt;
    return bDate.localeCompare(aDate);
  });
}

/** Group resolved maintenance by property, then unit. */
export function groupResolvedMaintenanceByPropertyAndUnit(
  requests: MaintenanceRequest[],
  properties: { id: string; formattedAddress: string; units: { unitLabel: string }[] }[],
  options?: { propertyId?: string },
): MaintenancePropertyGroup[] {
  const resolved = requests.filter((request) => request.status === "resolved");
  const filtered = options?.propertyId
    ? resolved.filter((request) => request.propertyId === options.propertyId)
    : resolved;

  const propertyOrder = new Map(
    properties.map((property, index) => [property.id, index]),
  );

  const byProperty = new Map<string, MaintenanceRequest[]>();

  for (const request of filtered) {
    const list = byProperty.get(request.propertyId) ?? [];
    list.push(request);
    byProperty.set(request.propertyId, list);
  }

  const groups: MaintenancePropertyGroup[] = [];

  for (const [propertyId, propertyRequests] of byProperty) {
    const property = properties.find((item) => item.id === propertyId);
    const address =
      property?.formattedAddress ??
      propertyRequests[0]?.propertyAddress ??
      "Property";

    const unitKeys = new Set<string>();
    if (property) {
      for (const unit of property.units) {
        unitKeys.add(unit.unitLabel);
      }
    }
    for (const request of propertyRequests) {
      unitKeys.add(maintenanceUnitKey(request.unitLabel));
    }

    const sortedUnits = [...unitKeys].sort((a, b) => {
      if (a === MAINTENANCE_WHOLE_PROPERTY_LABEL) return 1;
      if (b === MAINTENANCE_WHOLE_PROPERTY_LABEL) return -1;
      return a.localeCompare(b, undefined, { numeric: true });
    });

    const units: MaintenanceUnitGroup[] = sortedUnits.map((unitLabel) => ({
      unitLabel,
      requests: sortResolvedRequests(
        propertyRequests.filter(
          (request) => maintenanceUnitKey(request.unitLabel) === unitLabel,
        ),
      ),
    }));

    groups.push({
      propertyId,
      propertyAddress: address,
      requestCount: propertyRequests.length,
      units,
    });
  }

  groups.sort((a, b) => {
    const orderA = propertyOrder.get(a.propertyId) ?? 999;
    const orderB = propertyOrder.get(b.propertyId) ?? 999;
    if (orderA !== orderB) return orderA - orderB;
    return a.propertyAddress.localeCompare(b.propertyAddress);
  });

  return groups;
}

export const STATUS_LABELS: Record<MaintenanceStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
};

export const PRIORITY_LABELS: Record<MaintenancePriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};
