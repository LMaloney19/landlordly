import {
  formatAddressFromJoin,
  type PropertyAddressFields,
} from "@/lib/properties";
import type { MaintenancePriority, MaintenanceRequest, MaintenanceStatus } from "@/types";

export type MaintenanceRow = {
  id: string;
  user_id: string;
  property_id: string;
  title: string;
  description: string | null;
  status: MaintenanceStatus;
  priority: MaintenancePriority;
  created_at: string;
  resolved_at: string | null;
  properties: PropertyAddressFields | PropertyAddressFields[] | null;
};

export function rowToMaintenance(row: MaintenanceRow): MaintenanceRequest {
  return {
    id: row.id,
    propertyId: row.property_id,
    propertyAddress: formatAddressFromJoin(row.properties),
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    createdAt: row.created_at,
  };
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
