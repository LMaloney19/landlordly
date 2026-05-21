"use client";

import { useEffect, useMemo, useState, useTransition, type FormEvent } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { ExpenseReceiptField } from "@/components/expenses/expense-receipt-field";
import { ExpensesGroupedList } from "@/components/expenses/expenses-grouped-list";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_WHOLE_PROPERTY_LABEL,
  expenseUnitKey,
  groupExpensesByPropertyAndUnit,
  rowToExpense,
  type ExpenseRow,
} from "@/lib/expenses";
import {
  buildExpenseReceiptPath,
  EXPENSE_RECEIPT_BUCKET,
  EXPENSE_RECEIPT_MAX_BYTES,
} from "@/lib/expense-receipts";
import { hasDevBypass, signedOutSaveMessage } from "@/lib/dev-bypass";
import {
  PROPERTY_ADDRESS_SELECT,
  PROPERTY_WITH_UNITS_SELECT,
  rowToProperty,
  type PropertyRow,
} from "@/lib/properties";
import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { formatCurrency } from "@/lib/utils";
import type { Expense, ExpenseCategory, Property } from "@/types";

type ExpensesPageProps = {
  properties: Property[];
  initialExpenses: Expense[];
  loadError?: string;
};

type ExpenseDraft = {
  date: string;
  propertyId: string;
  unitLabel: string;
  category: ExpenseCategory;
  amount: string;
  vendor: string;
  notes: string;
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function newDraft(properties: Property[]): ExpenseDraft {
  const property = properties[0];
  return {
    date: todayIso(),
    propertyId: property?.id ?? "",
    unitLabel: "",
    category: "Repairs",
    amount: "",
    vendor: "",
    notes: "",
  };
}

function draftFromExpense(expense: Expense): ExpenseDraft {
  return {
    date: expense.date,
    propertyId: expense.propertyId,
    unitLabel: expense.unitLabel ?? "",
    category: expense.category,
    amount: String(expense.amount),
    vendor: expense.vendor,
    notes: expense.notes ?? "",
  };
}

async function deleteReceiptFromStorage(
  supabase: SupabaseClient,
  path: string | null,
) {
  if (!path) return;
  await supabase.storage.from(EXPENSE_RECEIPT_BUCKET).remove([path]);
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
  const [unitFilter, setUnitFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | "all">(
    "all",
  );
  const [search, setSearch] = useState("");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [draft, setDraft] = useState<ExpenseDraft>(() => newDraft(initialProperties));
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [clearReceipt, setClearReceipt] = useState(false);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedDraftProperty = useMemo(
    () => properties.find((property) => property.id === draft.propertyId),
    [draft.propertyId, properties],
  );

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
        const message =
          propertiesResult.error?.message ?? expensesResult.error?.message ?? "";
        setClientLoadError(
          message.includes("unit_label") || message.includes("receipt_path")
            ? "Run supabase/migrations/20250516040000_expense_receipts_and_units.sql in Supabase."
            : message.includes("relation")
              ? "Expenses table not found. Run supabase/migrations/20250516020000_expenses.sql in Supabase."
              : message || "Could not load expenses.",
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

  const unitFilterOptions = useMemo(() => {
    if (propertyFilter === "all") return [];
    const property = properties.find((item) => item.id === propertyFilter);
    if (!property) return [];

    const labels = new Set<string>([EXPENSE_WHOLE_PROPERTY_LABEL]);
    for (const unit of property.units) {
      labels.add(unit.unitLabel);
    }
    for (const expense of expenses) {
      if (expense.propertyId === propertyFilter) {
        labels.add(expenseUnitKey(expense.unitLabel));
      }
    }

    return [...labels].sort((a, b) => {
      if (a === EXPENSE_WHOLE_PROPERTY_LABEL) return -1;
      if (b === EXPENSE_WHOLE_PROPERTY_LABEL) return 1;
      return a.localeCompare(b, undefined, { numeric: true });
    });
  }, [expenses, properties, propertyFilter]);

  useEffect(() => {
    setUnitFilter("all");
  }, [propertyFilter]);

  const filteredExpenses = useMemo(() => {
    const query = search.trim().toLowerCase();

    return expenses
      .filter((expense) =>
        propertyFilter === "all" ? true : expense.propertyId === propertyFilter,
      )
      .filter((expense) =>
        unitFilter === "all"
          ? true
          : expenseUnitKey(expense.unitLabel) === unitFilter,
      )
      .filter((expense) =>
        categoryFilter === "all" ? true : expense.category === categoryFilter,
      )
      .filter((expense) => {
        if (!query) return true;
        return (
          expense.vendor.toLowerCase().includes(query) ||
          expense.category.toLowerCase().includes(query) ||
          expense.notes?.toLowerCase().includes(query) ||
          expense.propertyAddress.toLowerCase().includes(query) ||
          expense.unitLabel?.toLowerCase().includes(query)
        );
      });
  }, [categoryFilter, expenses, propertyFilter, search, unitFilter]);

  const groupedExpenses = useMemo(
    () => groupExpensesByPropertyAndUnit(filteredExpenses, properties),
    [filteredExpenses, properties],
  );

  const filteredTotal = filteredExpenses.reduce(
    (sum, expense) => sum + expense.amount,
    0,
  );

  function openDrawer() {
    setFormError(null);
    setReceiptError(null);
    setReceiptFile(null);
    setClearReceipt(false);
    setEditingExpense(null);
    setDraft(newDraft(properties));
    setIsDrawerOpen(true);
  }

  function openEditDrawer(expense: Expense) {
    setFormError(null);
    setReceiptError(null);
    setReceiptFile(null);
    setClearReceipt(false);
    setEditingExpense(expense);
    setDraft(draftFromExpense(expense));
    setIsDrawerOpen(true);
  }

  function closeDrawer() {
    setIsDrawerOpen(false);
    setEditingExpense(null);
    setFormError(null);
    setReceiptError(null);
    setReceiptFile(null);
    setClearReceipt(false);
  }

  function handleDelete(expense: Expense) {
    const confirmed = confirm(
      `Delete expense for "${expense.vendor}" (${formatCurrency(expense.amount)})?\n\nThis cannot be undone.`,
    );
    if (!confirmed) return;

    setActionError(null);
    setFormError(null);
    startTransition(async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setActionError(signedOutSaveMessage());
        return;
      }

      await deleteReceiptFromStorage(supabase, expense.receiptPath);

      const { error } = await supabase
        .from("expenses")
        .delete()
        .eq("id", expense.id)
        .eq("user_id", user.id);

      if (error) {
        setActionError(error.message);
        return;
      }

      setExpenses((current) => current.filter((item) => item.id !== expense.id));
      if (editingExpense?.id === expense.id) {
        closeDrawer();
      }
    });
  }

  function updateDraft(patch: Partial<ExpenseDraft>) {
    setDraft((current) => {
      const next = { ...current, ...patch };
      if (patch.propertyId !== undefined && patch.propertyId !== current.propertyId) {
        next.unitLabel = "";
      }
      return next;
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setReceiptError(null);

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
    if (receiptFile && receiptFile.size > EXPENSE_RECEIPT_MAX_BYTES) {
      setReceiptError("Receipt must be 10 MB or smaller.");
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

      const isEditing = editingExpense !== null;
      const expenseId = isEditing ? editingExpense.id : crypto.randomUUID();

      let receiptPath = isEditing ? editingExpense.receiptPath : null;
      let receiptMimeType = isEditing ? editingExpense.receiptMimeType : null;
      let receiptFileName = isEditing ? editingExpense.receiptFileName : null;

      if (clearReceipt && !receiptFile) {
        await deleteReceiptFromStorage(supabase, receiptPath);
        receiptPath = null;
        receiptMimeType = null;
        receiptFileName = null;
      } else if (receiptFile) {
        const nextPath = buildExpenseReceiptPath(user.id, expenseId, receiptFile.name);
        const { error: uploadError } = await supabase.storage
          .from(EXPENSE_RECEIPT_BUCKET)
          .upload(nextPath, receiptFile, { upsert: true });

        if (uploadError) {
          setReceiptError(uploadError.message);
          return;
        }

        if (
          isEditing &&
          editingExpense.receiptPath &&
          editingExpense.receiptPath !== nextPath
        ) {
          await deleteReceiptFromStorage(supabase, editingExpense.receiptPath);
        }

        receiptPath = nextPath;
        receiptMimeType = receiptFile.type || null;
        receiptFileName = receiptFile.name;
      }

      const unitLabel = draft.unitLabel.trim() || null;
      const payload = {
        property_id: draft.propertyId,
        unit_label: unitLabel,
        expense_date: draft.date,
        category: draft.category,
        amount,
        vendor: draft.vendor.trim(),
        notes: draft.notes.trim() || null,
        receipt_path: receiptPath,
        receipt_mime_type: receiptMimeType,
        receipt_file_name: receiptFileName,
      };

      const { data, error } = isEditing
        ? await supabase
            .from("expenses")
            .update(payload)
            .eq("id", expenseId)
            .eq("user_id", user.id)
            .select(`*, properties(${PROPERTY_ADDRESS_SELECT})`)
            .single()
        : await supabase
            .from("expenses")
            .insert({
              id: expenseId,
              user_id: user.id,
              ...payload,
            })
            .select(`*, properties(${PROPERTY_ADDRESS_SELECT})`)
            .single();

      if (error || !data) {
        const message = error?.message ?? "Expense could not be saved.";
        setFormError(
          message.includes("unit_label") || message.includes("receipt_path")
            ? "Run supabase/migrations/20250516040000_expense_receipts_and_units.sql in Supabase."
            : message.includes("relation")
              ? "Expenses table not found. Run the expenses SQL migration in Supabase."
              : message,
        );
        return;
      }

      const saved = rowToExpense(data as ExpenseRow);
      setExpenses((current) =>
        isEditing
          ? current.map((item) => (item.id === saved.id ? saved : item))
          : [saved, ...current],
      );
      closeDrawer();
    });
  }

  const inputClass =
    "mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 disabled:opacity-60";

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title="Expenses"
          description="Track costs by property and unit — attach receipts and roll up property totals."
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
        <header className="grid gap-3 border-b border-zinc-200 px-6 py-4 lg:grid-cols-[1fr_repeat(3,minmax(0,180px))] lg:items-end">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Portfolio expenses</h2>
            <p className="mt-0.5 text-sm text-zinc-500">
              {filteredExpenses.length} of {expenses.length} expenses ·{" "}
              {formatCurrency(filteredTotal)} filtered total
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
              Unit
            </span>
            <select
              value={unitFilter}
              onChange={(event) => setUnitFilter(event.target.value)}
              disabled={propertyFilter === "all"}
              className="mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-50"
            >
              <option value="all">
                {propertyFilter === "all" ? "Select property first" : "All units"}
              </option>
              {unitFilterOptions.map((label) => (
                <option key={label} value={label}>
                  {label === EXPENSE_WHOLE_PROPERTY_LABEL
                    ? "Whole property"
                    : `Unit ${label}`}
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

        <div className="border-b border-zinc-100 px-6 py-3">
          <label className="block">
            <span className="sr-only">Search expenses</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search vendor, notes, property, or unit…"
              className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200"
            />
          </label>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-medium text-zinc-900">
              {expenses.length === 0 ? "No expenses yet" : "No expenses found"}
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              {expenses.length === 0
                ? "Log your first expense and attach a receipt or invoice."
                : "Try changing filters or search."}
            </p>
          </div>
        ) : (
          <ExpensesGroupedList
            groups={groupedExpenses}
            collapseKey={search}
            onEdit={openEditDrawer}
            onDelete={handleDelete}
            isPending={isPending}
          />
        )}
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
                  {editingExpense ? "Edit expense" : "Log expense"}
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  {editingExpense
                    ? "Update details or replace the receipt."
                    : "Assign to a unit or whole property. Totals roll up to the building."}
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
                <p className="text-sm font-medium text-zinc-900">No properties yet</p>
                <p className="mt-1 text-sm text-zinc-500">
                  Add a property before logging expenses.
                </p>
              </section>
            ) : (
              <form onSubmit={handleSubmit}>
                <fieldset className="space-y-4" disabled={isPending}>
                  <label className="block">
                    <span className="text-sm font-medium text-zinc-700">Date</span>
                    <input
                      type="date"
                      value={draft.date}
                      onChange={(event) => updateDraft({ date: event.target.value })}
                      className={inputClass}
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-zinc-700">Property</span>
                    <select
                      value={draft.propertyId}
                      onChange={(event) =>
                        updateDraft({ propertyId: event.target.value })
                      }
                      className={inputClass}
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
                      Apartment / unit
                    </span>
                    <select
                      value={draft.unitLabel}
                      onChange={(event) =>
                        updateDraft({ unitLabel: event.target.value })
                      }
                      className={inputClass}
                    >
                      <option value="">Whole property (all units)</option>
                      {(selectedDraftProperty?.units ?? []).map((unit) => (
                        <option key={unit.id} value={unit.unitLabel}>
                          Unit {unit.unitLabel}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-zinc-500">
                      Optional. Unit expenses still count toward the property total.
                    </p>
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-zinc-700">Category</span>
                    <select
                      value={draft.category}
                      onChange={(event) =>
                        updateDraft({
                          category: event.target.value as ExpenseCategory,
                        })
                      }
                      className={inputClass}
                    >
                      {EXPENSE_CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-zinc-700">Amount</span>
                    <input
                      type="number"
                      min={0.01}
                      step={0.01}
                      value={draft.amount}
                      onChange={(event) =>
                        updateDraft({ amount: event.target.value })
                      }
                      placeholder="250.00"
                      className={inputClass}
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
                      className={inputClass}
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-zinc-700">Notes</span>
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

                  <ExpenseReceiptField
                    file={receiptFile}
                    onFileChange={(file) => {
                      setReceiptFile(file);
                      if (file) setClearReceipt(false);
                    }}
                    existingReceipt={
                      editingExpense?.receiptPath
                        ? { fileName: editingExpense.receiptFileName }
                        : null
                    }
                    clearExisting={clearReceipt}
                    onClearExisting={() => setClearReceipt(true)}
                    disabled={isPending}
                    error={receiptError}
                  />
                </fieldset>

                {formError ? (
                  <p className="mt-4 text-sm text-red-600" role="alert">
                    {formError}
                  </p>
                ) : null}

                <div className="mt-6 space-y-2">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="w-full rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-60"
                  >
                    {isPending
                      ? "Saving..."
                      : editingExpense
                        ? "Save changes"
                        : "Save expense"}
                  </button>
                  {editingExpense ? (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleDelete(editingExpense)}
                      className="w-full rounded-md border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                    >
                      Delete expense
                    </button>
                  ) : null}
                </div>
              </form>
            )}
          </aside>
        </div>
      ) : null}
    </>
  );
}
