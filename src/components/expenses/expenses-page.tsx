"use client";

import { useEffect, useMemo, useState, useTransition, type FormEvent } from "react";
import { PageHeader } from "@/components/ui/page-header";
import {
  EXPENSE_CATEGORIES,
  rowToExpense,
  type ExpenseRow,
} from "@/lib/expenses";
import { hasDevBypass, signedOutSaveMessage } from "@/lib/dev-bypass";
import {
  PROPERTY_ADDRESS_SELECT,
  PROPERTY_WITH_UNITS_SELECT,
  rowToProperty,
  type PropertyRow,
} from "@/lib/properties";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";
import type { Expense, ExpenseCategory, Property } from "@/types";

type ExpensesPageProps = {
  properties: Property[];
  initialExpenses: Expense[];
  loadError?: string;
};

type SortKey = "date" | "property" | "category" | "amount" | "vendor";
type SortDirection = "asc" | "desc";

type ExpenseDraft = {
  date: string;
  propertyId: string;
  category: ExpenseCategory;
  amount: string;
  vendor: string;
  notes: string;
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(isoDate: string) {
  return new Date(isoDate + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function newDraft(properties: Property[]): ExpenseDraft {
  return {
    date: todayIso(),
    propertyId: properties[0]?.id ?? "",
    category: "Repairs",
    amount: "",
    vendor: "",
    notes: "",
  };
}

function compareExpenses(a: Expense, b: Expense, key: SortKey) {
  if (key === "amount") return a.amount - b.amount;

  const aValue =
    key === "date"
      ? a.date
      : key === "property"
        ? a.propertyAddress
        : key === "category"
          ? a.category
          : a.vendor;
  const bValue =
    key === "date"
      ? b.date
      : key === "property"
        ? b.propertyAddress
        : key === "category"
          ? b.category
          : b.vendor;

  return aValue.localeCompare(bValue);
}

export function ExpensesPageClient({
  properties: initialProperties,
  initialExpenses,
  loadError,
}: ExpensesPageProps) {
  const [properties, setProperties] = useState<Property[]>(initialProperties);
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [clientLoadError, setClientLoadError] = useState<string | null>(null);
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | "all">(
    "all",
  );
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [draft, setDraft] = useState<ExpenseDraft>(() => newDraft(initialProperties));
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;

    async function loadExpenseData() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (hasDevBypass()) {
          setClientLoadError(null);
          setProperties([]);
          setExpenses([]);
          return;
        }
        setClientLoadError("Sign in to load expenses.");
        return;
      }

      const [propertiesResult, expensesResult] = await Promise.all([
        supabase
          .from("properties")
          .select(PROPERTY_WITH_UNITS_SELECT)
          .order("created_at", { ascending: false }),
        supabase
          .from("expenses")
          .select(`*, properties(${PROPERTY_ADDRESS_SELECT})`)
          .order("expense_date", { ascending: false })
          .order("created_at", { ascending: false }),
      ]);

      if (cancelled) return;

      if (propertiesResult.error || expensesResult.error) {
        setClientLoadError(
          propertiesResult.error?.message ??
            (expensesResult.error?.message.includes("relation")
              ? "Expenses table not found. Run supabase/migrations/20250516020000_expenses.sql in Supabase."
              : expensesResult.error?.message) ??
            "Could not load expenses.",
        );
        return;
      }

      const loadedProperties = (propertiesResult.data as PropertyRow[])
        .filter((property) => !property.archived_at)
        .map(rowToProperty);

      setClientLoadError(null);
      setProperties(loadedProperties);
      setExpenses((expensesResult.data as ExpenseRow[]).map(rowToExpense));
      setDraft((current) => ({
        ...current,
        propertyId: current.propertyId || loadedProperties[0]?.id || "",
      }));
    }

    void loadExpenseData();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredExpenses = useMemo(() => {
    return expenses
      .filter((expense) =>
        propertyFilter === "all" ? true : expense.propertyId === propertyFilter,
      )
      .filter((expense) =>
        categoryFilter === "all" ? true : expense.category === categoryFilter,
      )
      .sort((a, b) => {
        const result = compareExpenses(a, b, sortKey);
        return sortDirection === "asc" ? result : -result;
      });
  }, [categoryFilter, expenses, propertyFilter, sortDirection, sortKey]);

  const total = filteredExpenses.reduce(
    (sum, expense) => sum + expense.amount,
    0,
  );

  function setSort(nextKey: SortKey) {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextKey);
    setSortDirection(nextKey === "amount" ? "desc" : "asc");
  }

  function sortLabel(key: SortKey) {
    if (sortKey !== key) return "";
    return sortDirection === "asc" ? " ↑" : " ↓";
  }

  function openDrawer() {
    setFormError(null);
    setDraft(newDraft(properties));
    setIsDrawerOpen(true);
  }

  function closeDrawer() {
    setIsDrawerOpen(false);
    setFormError(null);
  }

  function updateDraft(patch: Partial<ExpenseDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (!draft.date) {
      setFormError("Expense date is required.");
      return;
    }
    if (!draft.propertyId) {
      setFormError("Select a property.");
      return;
    }
    const amount = Number(draft.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError("Amount must be greater than 0.");
      return;
    }
    if (!draft.vendor.trim()) {
      setFormError("Vendor/payee name is required.");
      return;
    }

    startTransition(async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setFormError(signedOutSaveMessage());
        return;
      }

      const { data, error } = await supabase
        .from("expenses")
        .insert({
          user_id: user.id,
          property_id: draft.propertyId,
          expense_date: draft.date,
          category: draft.category,
          amount,
          vendor: draft.vendor.trim(),
          notes: draft.notes.trim() || null,
        })
        .select(`*, properties(${PROPERTY_ADDRESS_SELECT})`)
        .single();

      if (error || !data) {
        setFormError(
          error?.message.includes("relation")
            ? "Expenses table not found. Run the expenses SQL migration in Supabase."
            : error?.message ?? "Expense could not be saved.",
        );
        return;
      }

      setExpenses((current) => [rowToExpense(data as ExpenseRow), ...current]);
      closeDrawer();
    });
  }

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title="Expenses"
          description="Track deductible costs across properties and categories."
        />
        <button
          type="button"
          onClick={openDrawer}
          className="rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
        >
          Log expense
        </button>
      </div>

      {loadError || clientLoadError ? (
        <p
          className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
          role="alert"
        >
          {clientLoadError ?? loadError}
        </p>
      ) : null}

      <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
        <header className="grid gap-3 border-b border-zinc-200 px-6 py-4 md:grid-cols-[1fr_240px_220px] md:items-end">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">All expenses</h2>
            <p className="mt-0.5 text-sm text-zinc-500">
              {filteredExpenses.length} of {expenses.length} expenses
            </p>
          </div>
          <label>
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Property
            </span>
            <select
              value={propertyFilter}
              onChange={(event) => setPropertyFilter(event.target.value)}
              className="mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200"
            >
              <option value="all">All properties</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.formattedAddress}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Category
            </span>
            <select
              value={categoryFilter}
              onChange={(event) =>
                setCategoryFilter(event.target.value as ExpenseCategory | "all")
              }
              className="mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200"
            >
              <option value="all">All categories</option>
              {EXPENSE_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
        </header>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-200 text-sm">
            <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3">
                  <button type="button" onClick={() => setSort("date")}>
                    Date{sortLabel("date")}
                  </button>
                </th>
                <th className="px-4 py-3">
                  <button type="button" onClick={() => setSort("property")}>
                    Property{sortLabel("property")}
                  </button>
                </th>
                <th className="px-4 py-3">
                  <button type="button" onClick={() => setSort("category")}>
                    Category{sortLabel("category")}
                  </button>
                </th>
                <th className="px-4 py-3 text-right">
                  <button type="button" onClick={() => setSort("amount")}>
                    Amount{sortLabel("amount")}
                  </button>
                </th>
                <th className="px-4 py-3">
                  <button type="button" onClick={() => setSort("vendor")}>
                    Vendor/payee{sortLabel("vendor")}
                  </button>
                </th>
                <th className="px-4 py-3">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 bg-white">
              {filteredExpenses.map((expense) => (
                <tr key={expense.id} className="hover:bg-zinc-50/80">
                  <td className="whitespace-nowrap px-4 py-3 text-zinc-600">
                    {formatDate(expense.date)}
                  </td>
                  <td className="min-w-56 px-4 py-3 text-zinc-600">
                    {expense.propertyAddress}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-zinc-600">
                    {expense.category}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-zinc-900">
                    {formatCurrency(expense.amount)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-zinc-600">
                    {expense.vendor}
                  </td>
                  <td className="min-w-48 px-4 py-3 text-zinc-500">
                    {expense.notes || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-zinc-200 bg-zinc-50">
              <tr>
                <td
                  colSpan={3}
                  className="px-4 py-3 text-sm font-semibold text-zinc-900"
                >
                  Total
                </td>
                <td className="px-4 py-3 text-right text-sm font-semibold text-zinc-900">
                  {formatCurrency(total)}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-medium text-zinc-900">
              {expenses.length === 0 ? "No expenses yet" : "No expenses found"}
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              {expenses.length === 0
                ? "Log your first expense to start tracking costs."
                : "Try changing the property or category filter."}
            </p>
          </div>
        ) : null}
      </section>

      {isDrawerOpen ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close expense drawer"
            className="absolute inset-0 bg-zinc-900/30"
            onClick={closeDrawer}
          />
          <aside className="absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-xl">
            <header className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-zinc-900">
                  Log expense
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Add cost details for a property.
                </p>
              </div>
              <button
                type="button"
                onClick={closeDrawer}
                className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Close
              </button>
            </header>

            {properties.length === 0 ? (
              <section className="rounded-lg border border-dashed border-zinc-300 p-6 text-center">
                <p className="text-sm font-medium text-zinc-900">
                  No properties yet
                </p>
                <p className="mt-1 text-sm text-zinc-500">
                  Add a property before logging expenses.
                </p>
              </section>
            ) : (
              <form onSubmit={handleSubmit}>
                <fieldset className="space-y-4" disabled={isPending}>
                  <label className="block">
                    <span className="text-sm font-medium text-zinc-700">
                      Date
                    </span>
                    <input
                      type="date"
                      value={draft.date}
                      onChange={(event) => updateDraft({ date: event.target.value })}
                      className="mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 disabled:opacity-60"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-zinc-700">
                      Property
                    </span>
                    <select
                      value={draft.propertyId}
                      onChange={(event) =>
                        updateDraft({ propertyId: event.target.value })
                      }
                      className="mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 disabled:opacity-60"
                    >
                      {properties.map((property) => (
                        <option key={property.id} value={property.id}>
                          {property.formattedAddress}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-zinc-700">
                      Category
                    </span>
                    <select
                      value={draft.category}
                      onChange={(event) =>
                        updateDraft({
                          category: event.target.value as ExpenseCategory,
                        })
                      }
                      className="mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 disabled:opacity-60"
                    >
                      {EXPENSE_CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-zinc-700">
                      Amount
                    </span>
                    <input
                      type="number"
                      min={0.01}
                      step={0.01}
                      value={draft.amount}
                      onChange={(event) =>
                        updateDraft({ amount: event.target.value })
                      }
                      placeholder="250.00"
                      className="mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 disabled:opacity-60"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-zinc-700">
                      Vendor/payee name
                    </span>
                    <input
                      type="text"
                      value={draft.vendor}
                      onChange={(event) =>
                        updateDraft({ vendor: event.target.value })
                      }
                      placeholder="ABC Plumbing"
                      className="mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 disabled:opacity-60"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-zinc-700">
                      Notes
                    </span>
                    <textarea
                      value={draft.notes}
                      onChange={(event) =>
                        updateDraft({ notes: event.target.value })
                      }
                      rows={3}
                      placeholder="Optional details..."
                      className="mt-1.5 w-full resize-none rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 disabled:opacity-60"
                    />
                  </label>
                </fieldset>

                {formError ? (
                  <p className="mt-4 text-sm text-red-600" role="alert">
                    {formError}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={isPending}
                  className="mt-6 w-full rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-60"
                >
                  {isPending ? "Saving..." : "Save expense"}
                </button>
              </form>
            )}
          </aside>
        </div>
      ) : null}
    </>
  );
}
