"use client";

import { useState } from "react";
import type { ReportData } from "@/app/actions/reports";
import { hasDevBypass } from "@/lib/dev-bypass";
import {
  formatAddressFromJoin,
  PROPERTY_ADDRESS_SELECT,
  type PropertyAddressFields,
} from "@/lib/properties";
import { createClient } from "@/lib/supabase/client";
import type { ExpenseCategory } from "@/types";

type ReportsExportProps = {
  data: ReportData;
};

type RentTaxRow = {
  amount: number;
  paid_at: string;
  notes: string | null;
  properties: PropertyAddressFields | PropertyAddressFields[] | null;
};

type ExpenseTaxRow = {
  amount: number;
  expense_date: string;
  category: ExpenseCategory;
  vendor: string;
  notes: string | null;
  properties: PropertyAddressFields | PropertyAddressFields[] | null;
};

const scheduleECategories = [
  "Rents Received",
  "Advertising",
  "Auto & Travel",
  "Cleaning & Maintenance",
  "Commissions",
  "Insurance",
  "Legal & Professional",
  "Management Fees",
  "Mortgage Interest",
  "Repairs",
  "Supplies",
  "Taxes",
  "Utilities",
  "Other Expenses",
] as const;

function currentTaxYear() {
  return String(new Date().getFullYear());
}

function escapeCsvCell(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function rowsToCsv(rows: unknown[][]) {
  return rows.map((row) => row.map(escapeCsvCell).join(",")).join("\n");
}

function expenseToScheduleECategory(category: ExpenseCategory) {
  if (category === "Other") return "Other Expenses";
  return category;
}

function downloadCsvFile(filename: string, rows: unknown[][]) {
  const blob = new Blob([rowsToCsv(rows)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function ReportsExport({ data }: ReportsExportProps) {
  const [isTaxModalOpen, setIsTaxModalOpen] = useState(false);
  const [taxYear, setTaxYear] = useState(currentTaxYear);
  const [taxExportError, setTaxExportError] = useState<string | null>(null);
  const [isTaxExporting, setIsTaxExporting] = useState(false);

  function downloadCsv() {
    const rows = [
      ["Landlordly Portfolio Report"],
      ["Generated", new Date().toLocaleString()],
      [],
      ["Portfolio"],
      ["Properties", String(data.propertyCount)],
      ["Total units", String(data.totalUnits)],
      ["Expected monthly rent", String(data.expectedMonthlyRent)],
      ["Active tenants", String(data.tenantCount)],
      ["Open maintenance", String(data.openMaintenance)],
      [],
      ["Rent income"],
      ["Collected this month", String(data.rentCollectedThisMonth)],
      ["Collected YTD", String(data.rentCollectedYtd)],
      ["Total payment records", String(data.totalPayments)],
      [],
      ["Rent by month (last 6 months)"],
      ["Month", "Amount"],
      ...data.rentByMonth.map((row) => [row.label, String(row.total)]),
    ];

    downloadCsvFile(
      `landlordly-report-${new Date().toISOString().slice(0, 10)}.csv`,
      rows,
    );
  }

  async function downloadTaxCsv() {
    const year = Number(taxYear);
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      setTaxExportError("Choose a valid tax year.");
      return;
    }

    setIsTaxExporting(true);
    setTaxExportError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setTaxExportError(
        hasDevBypass()
          ? "Sign in with Supabase to export tax data."
          : "Sign in to export tax data.",
      );
      setIsTaxExporting(false);
      return;
    }

    const start = `${year}-01-01`;
    const end = `${year}-12-31`;

    const [rentResult, expensesResult] = await Promise.all([
      supabase
        .from("rent_payments")
        .select(`amount, paid_at, notes, properties(${PROPERTY_ADDRESS_SELECT})`)
        .gte("paid_at", start)
        .lte("paid_at", end)
        .order("paid_at", { ascending: true }),
      supabase
        .from("expenses")
        .select(
          `amount, expense_date, category, vendor, notes, properties(${PROPERTY_ADDRESS_SELECT})`,
        )
        .gte("expense_date", start)
        .lte("expense_date", end)
        .order("expense_date", { ascending: true }),
    ]);

    setIsTaxExporting(false);

    if (rentResult.error) {
      setTaxExportError(rentResult.error.message);
      return;
    }

    if (expensesResult.error) {
      setTaxExportError(
        expensesResult.error.message.includes("expenses")
          ? "Expenses table not found. Run the expenses migration in Supabase."
          : expensesResult.error.message,
      );
      return;
    }

    const rentRows = (rentResult.data ?? []) as RentTaxRow[];
    const expenseRows = (expensesResult.data ?? []) as ExpenseTaxRow[];

    const totals = new Map<string, number>(
      scheduleECategories.map((category) => [category, 0]),
    );

    for (const row of rentRows) {
      totals.set(
        "Rents Received",
        (totals.get("Rents Received") ?? 0) + Number(row.amount),
      );
    }

    for (const row of expenseRows) {
      const category = expenseToScheduleECategory(row.category);
      totals.set(category, (totals.get(category) ?? 0) + Number(row.amount));
    }

    const rows: unknown[][] = [
      ["Landlordly Tax Report"],
      ["Tax Year", String(year)],
      ["Generated", new Date().toLocaleString()],
      [],
      ["Schedule E Summary"],
      ["Category", "Amount"],
      ...scheduleECategories.map((category) => [
        category,
        (totals.get(category) ?? 0).toFixed(2),
      ]),
      [],
      ["Rents Received Detail"],
      ["Date", "Property", "Amount", "Notes"],
      ...rentRows.map((row) => [
        row.paid_at,
        formatAddressFromJoin(row.properties),
        Number(row.amount).toFixed(2),
        row.notes ?? "",
      ]),
      [],
      ["Expense Detail"],
      ["Date", "Schedule E Category", "Original Category", "Property", "Vendor/Payee", "Amount", "Notes"],
      ...expenseRows.map((row) => [
        row.expense_date,
        expenseToScheduleECategory(row.category),
        row.category,
        formatAddressFromJoin(row.properties),
        row.vendor,
        Number(row.amount).toFixed(2),
        row.notes ?? "",
      ]),
    ];

    downloadCsvFile(`Landlordly_TaxReport_${year}.csv`, rows);
    setIsTaxModalOpen(false);
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={downloadCsv}
          className="rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50"
        >
          Export CSV
        </button>
        <button
          type="button"
          onClick={() => {
            setTaxExportError(null);
            setTaxYear(currentTaxYear());
            setIsTaxModalOpen(true);
          }}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-800"
        >
          Export for Taxes
        </button>
      </div>

      {isTaxModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button
            type="button"
            aria-label="Close tax export modal"
            className="absolute inset-0 bg-zinc-900/30"
            onClick={() => setIsTaxModalOpen(false)}
          />
          <section className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <header>
              <h2 className="text-lg font-semibold tracking-tight text-zinc-900">
                Export for Taxes
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Select the tax year to generate a Schedule E CSV export.
              </p>
            </header>

            <label className="mt-6 block">
              <span className="text-sm font-medium text-zinc-700">
                Tax year
              </span>
              <input
                type="number"
                min={2000}
                max={2100}
                value={taxYear}
                onChange={(event) => setTaxYear(event.target.value)}
                className="mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200"
              />
            </label>

            {taxExportError ? (
              <p className="mt-4 text-sm text-red-600" role="alert">
                {taxExportError}
              </p>
            ) : null}

            <div className="mt-6 flex gap-2">
              <button
                type="button"
                disabled={isTaxExporting}
                onClick={downloadTaxCsv}
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-60"
              >
                {isTaxExporting ? "Generating..." : "Download CSV"}
              </button>
              <button
                type="button"
                disabled={isTaxExporting}
                onClick={() => setIsTaxModalOpen(false)}
                className="rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
