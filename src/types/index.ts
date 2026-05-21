export type PropertyUnit = {
  id: string;
  propertyId: string;
  unitLabel: string;
  bedrooms: number;
  monthlyRent: number;
};

export type Property = {
  id: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  formattedAddress: string;
  units: PropertyUnit[];
  unitCount: number;
  totalMonthlyRent: number;
};

export type PropertyUnitInput = {
  unitLabel: string;
  bedrooms: number;
  monthlyRent: number;
};

export type PropertyAddressInput = {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
  unitEntries: PropertyUnitInput[];
};

export type DocumentCategory = "lease" | "receipt" | "inspection" | "other";

export type Document = {
  id: string;
  propertyId: string | null;
  propertyAddress: string | null;
  name: string;
  filePath: string;
  category: DocumentCategory;
  mimeType: string | null;
  sizeBytes: number | null;
  createdAt: string;
};

export type MaintenanceStatus = "open" | "in_progress" | "resolved";
export type MaintenancePriority = "low" | "medium" | "high";

export type MaintenanceRequest = {
  id: string;
  propertyId: string;
  propertyAddress: string;
  title: string;
  description: string | null;
  status: MaintenanceStatus;
  priority: MaintenancePriority;
  createdAt: string;
};

export type Tenant = {
  id: string;
  propertyId: string;
  propertyAddress: string;
  name: string;
  email: string | null;
  phone: string | null;
  unitLabel: string | null;
  leaseStart: string | null;
  leaseEnd: string;
  monthlyRent: number | null;
  securityDeposit: number | null;
  petName: string | null;
  petType: string | null;
};

export type RentPayment = {
  id: string;
  propertyId: string;
  propertyAddress: string;
  amount: number;
  paidAt: string;
  notes: string | null;
};

export type ExpenseCategory =
  | "Repairs"
  | "Insurance"
  | "Mortgage Interest"
  | "Utilities"
  | "Management Fees"
  | "Advertising"
  | "Legal & Professional"
  | "Supplies"
  | "Taxes"
  | "Other";

export type Expense = {
  id: string;
  propertyId: string;
  propertyAddress: string;
  date: string;
  category: ExpenseCategory;
  amount: number;
  vendor: string;
  notes: string | null;
};

export type DashboardStats = {
  totalUnits: number;
  rentCollectedThisMonth: number;
  expectedMonthlyRent: number;
  propertyCount: number;
  openMaintenanceRequests: number;
  leasesExpiringSoon: number;
};
