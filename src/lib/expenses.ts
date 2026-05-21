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

/** Expenses without a unit roll up under this label in the UI. */
export const EXPENSE_WHOLE_PROPERTY_LABEL = "— Whole property";

export type ExpenseRow = {
  id: string;
  user_id: string;
  property_id: string;
  unit_label?: string | null;
  expense_date: string;
  category: ExpenseCategory;
  amount: number;
  vendor: string;
  notes: string | null;
  receipt_path?: string | null;
  receipt_mime_type?: string | null;
  receipt_file_name?: string | null;
  created_at: string;
  properties: PropertyAddressFields | PropertyAddressFields[] | null;
};

export function expenseUnitKey(unitLabel: string | null | undefined) {
  const trimmed = unitLabel?.trim();
  return trimmed ? trimmed : EXPENSE_WHOLE_PROPERTY_LABEL;
}

export function formatExpenseUnitTitle(unitLabel: string) {
  if (unitLabel === EXPENSE_WHOLE_PROPERTY_LABEL) return "Whole property";
  return `Unit ${unitLabel}`;
}

export function rowToExpense(row: ExpenseRow): Expense {
  return {
    id: row.id,
    propertyId: row.property_id,
    propertyAddress: formatAddressFromJoin(row.properties),
    unitLabel: row.unit_label?.trim() || null,
    date: row.expense_date,
    category: row.category,
    amount: Number(row.amount),
    vendor: row.vendor,
    notes: row.notes,
    receiptPath: row.receipt_path ?? null,
    receiptMimeType: row.receipt_mime_type ?? null,
    receiptFileName: row.receipt_file_name ?? null,
  };
}

export type ExpensePropertyGroup = {
  propertyId: string;
  propertyAddress: string;
  propertyTotal: number;
  units: ExpenseUnitGroup[];
};

export type ExpenseUnitGroup = {
  unitLabel: string;
  unitTotal: number;
  expenses: Expense[];
};

/** Group expenses by property, then unit. Property total includes all units. */
export function groupExpensesByPropertyAndUnit(
  expenses: Expense[],
  properties: { id: string; formattedAddress: string; units: { unitLabel: string }[] }[],
): ExpensePropertyGroup[] {
  const propertyOrder = new Map(
    properties.map((property, index) => [property.id, index]),
  );

  const byProperty = new Map<string, Expense[]>();

  for (const expense of expenses) {
    const list = byProperty.get(expense.propertyId) ?? [];
    list.push(expense);
    byProperty.set(expense.propertyId, list);
  }

  const groups: ExpensePropertyGroup[] = [];

  for (const [propertyId, propertyExpenses] of byProperty) {
    const property = properties.find((p) => p.id === propertyId);
    const address =
      property?.formattedAddress ??
      propertyExpenses[0]?.propertyAddress ??
      "Property";

    const unitKeys = new Set<string>();
    if (property) {
      for (const unit of property.units) {
        unitKeys.add(unit.unitLabel);
      }
    }
    for (const expense of propertyExpenses) {
      unitKeys.add(expenseUnitKey(expense.unitLabel));
    }

    const sortedUnits = [...unitKeys].sort((a, b) => {
      if (a === EXPENSE_WHOLE_PROPERTY_LABEL) return -1;
      if (b === EXPENSE_WHOLE_PROPERTY_LABEL) return 1;
      return a.localeCompare(b, undefined, { numeric: true });
    });

    const units: ExpenseUnitGroup[] = sortedUnits.map((unitLabel) => {
      const unitExpenses = propertyExpenses
        .filter((expense) => expenseUnitKey(expense.unitLabel) === unitLabel)
        .sort((a, b) => b.date.localeCompare(a.date));

      return {
        unitLabel,
        unitTotal: unitExpenses.reduce((sum, expense) => sum + expense.amount, 0),
        expenses: unitExpenses,
      };
    });

    groups.push({
      propertyId,
      propertyAddress: address,
      propertyTotal: propertyExpenses.reduce((sum, expense) => sum + expense.amount, 0),
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
