import {
  formatAddressFromJoin,
  type PropertyAddressFields,
} from "@/lib/properties";
import type { Expense, ExpenseCategory } from "@/types";

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "Repairs",
  "Insurance",
  "Mortgage Interest",
  "Utilities",
  "Management Fees",
  "Advertising",
  "Legal & Professional",
  "Supplies",
  "Taxes",
  "Other",
];

export type ExpenseRow = {
  id: string;
  user_id: string;
  property_id: string;
  expense_date: string;
  category: ExpenseCategory;
  amount: number;
  vendor: string;
  notes: string | null;
  created_at: string;
  properties: PropertyAddressFields | PropertyAddressFields[] | null;
};

export function rowToExpense(row: ExpenseRow): Expense {
  return {
    id: row.id,
    propertyId: row.property_id,
    propertyAddress: formatAddressFromJoin(row.properties),
    date: row.expense_date,
    category: row.category,
    amount: Number(row.amount),
    vendor: row.vendor,
    notes: row.notes,
  };
}
