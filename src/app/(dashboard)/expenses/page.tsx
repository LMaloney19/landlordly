import { ExpensesPageClient } from "@/components/expenses/expenses-page";
import { rowToExpense, type ExpenseRow } from "@/lib/expenses";
import {
  PROPERTY_ADDRESS_SELECT,
  PROPERTY_WITH_UNITS_SELECT,
  rowToProperty,
  type PropertyRow,
} from "@/lib/properties";
import { createPageClient } from "@/lib/supabase/page";

export const dynamic = "force-dynamic";

function migrationHint(error: string) {
  if (error.includes("expenses") || error.includes("relation")) {
    return "Expenses table not found. Run supabase/migrations/20250516020000_expenses.sql in the SQL Editor.";
  }
  return error;
}

export default async function ExpensesPage() {
  const page = await createPageClient();

  if (!page.configured) {
    return (
      <ExpensesPageClient
        properties={[]}
        initialExpenses={[]}
        loadError="Supabase is not configured. Add keys to .env.local."
      />
    );
  }

  const { supabase } = page;

  const { data: propertiesData, error: propertiesError } = await supabase
    .from("properties")
    .select(PROPERTY_WITH_UNITS_SELECT)
    .order("created_at", { ascending: false });

  const { data: expensesData, error: expensesError } = await supabase
    .from("expenses")
    .select(`*, properties(${PROPERTY_ADDRESS_SELECT})`)
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false });

  const loadError = propertiesError
    ? propertiesError.message
    : expensesError
      ? migrationHint(expensesError.message)
      : undefined;

  return (
    <ExpensesPageClient
      properties={
        propertiesData
          ? (propertiesData as PropertyRow[])
              .filter((property) => !property.archived_at)
              .map(rowToProperty)
          : []
      }
      initialExpenses={
        expensesData ? (expensesData as ExpenseRow[]).map(rowToExpense) : []
      }
      loadError={loadError}
    />
  );
}
