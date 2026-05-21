"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EXPENSE_CATEGORIES } from "@/lib/expenses";
import { hasDevBypass } from "@/lib/dev-bypass";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";
import type { ExpenseCategory } from "@/types";

type PeriodType = "month" | "year";

type RentRow = {
  amount: number;
  paid_at: string;
};

type ExpenseRow = {
  amount: number;
  expense_date: string;
  category: ExpenseCategory;
};

type ChartRow = {
  month: string;
  income: number;
  expenses: number;
};

function currentMonthValue() {
  return new Date().toISOString().slice(0, 7);
}

function currentYearValue() {
  return String(new Date().getFullYear());
}

function monthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

function rangeForPeriod(periodType: PeriodType, month: string, year: string) {
  if (periodType === "month") {
    const [selectedYear, selectedMonth] = month.split("-").map(Number);
    const start = new Date(selectedYear, selectedMonth - 1, 1);
    const end = new Date(selectedYear, selectedMonth, 0);

    return {
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
      monthKeys: [month],
    };
  }

  const selectedYear = Number(year);
  const monthKeys = Array.from({ length: 12 }, (_, index) =>
    `${selectedYear}-${String(index + 1).padStart(2, "0")}`,
  );

  return {
    start: `${selectedYear}-01-01`,
    end: `${selectedYear}-12-31`,
    monthKeys,
  };
}

export function ProfitLossReport() {
  const [periodType, setPeriodType] = useState<PeriodType>("year");
  const [month, setMonth] = useState(currentMonthValue);
  const [year, setYear] = useState(currentYearValue);
  const [rentRows, setRentRows] = useState<RentRow[]>([]);
  const [expenseRows, setExpenseRows] = useState<ExpenseRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const selectedRange = useMemo(
    () => rangeForPeriod(periodType, month, year),
    [month, periodType, year],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadProfitLoss() {
      setIsLoading(true);
      setError(null);

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setRentRows([]);
        setExpenseRows([]);
        setIsLoading(false);
        setError(
          hasDevBypass()
            ? "Sign in with Supabase to load P&L data."
            : "Sign in to load P&L data.",
        );
        return;
      }

      const [rentResult, expensesResult] = await Promise.all([
        supabase
          .from("rent_payments")
          .select("amount, paid_at")
          .gte("paid_at", selectedRange.start)
          .lte("paid_at", selectedRange.end),
        supabase
          .from("expenses")
          .select("amount, expense_date, category")
          .gte("expense_date", selectedRange.start)
          .lte("expense_date", selectedRange.end),
      ]);

      if (cancelled) return;

      setIsLoading(false);

      if (rentResult.error) {
        setError(rentResult.error.message);
        return;
      }

      if (expensesResult.error) {
        setError(
          expensesResult.error.message.includes("expenses")
            ? "Expenses table not found. Run supabase/migrations/20250516020000_expenses.sql in Supabase."
            : expensesResult.error.message,
        );
        return;
      }

      setRentRows((rentResult.data ?? []) as RentRow[]);
      setExpenseRows((expensesResult.data ?? []) as ExpenseRow[]);
    }

    void loadProfitLoss();

    return () => {
      cancelled = true;
    };
  }, [selectedRange.end, selectedRange.start]);

  const totalIncome = rentRows.reduce((sum, row) => sum + Number(row.amount), 0);
  const totalExpenses = expenseRows.reduce(
    (sum, row) => sum + Number(row.amount),
    0,
  );
  const netOperatingIncome = totalIncome - totalExpenses;

  const expensesByCategory = EXPENSE_CATEGORIES.map((category) => ({
    category,
    total: expenseRows
      .filter((row) => row.category === category)
      .reduce((sum, row) => sum + Number(row.amount), 0),
  })).filter((row) => row.total > 0);

  const chartData: ChartRow[] = selectedRange.monthKeys.map((monthKey) => {
    const income = rentRows
      .filter((row) => row.paid_at.slice(0, 7) === monthKey)
      .reduce((sum, row) => sum + Number(row.amount), 0);
    const expenses = expenseRows
      .filter((row) => row.expense_date.slice(0, 7) === monthKey)
      .reduce((sum, row) => sum + Number(row.amount), 0);

    return {
      month: monthLabel(monthKey),
      income,
      expenses,
    };
  });

  return (
    <section className="mt-8 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
      <header className="flex flex-col gap-4 border-b border-zinc-100 pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-zinc-900">
            Profit & Loss
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Rent income, expenses, and net operating income for the selected
            period.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <label>
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Period
            </span>
            <select
              value={periodType}
              onChange={(event) => setPeriodType(event.target.value as PeriodType)}
              className="mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200"
            >
              <option value="month">Month</option>
              <option value="year">Year</option>
            </select>
          </label>

          {periodType === "month" ? (
            <label className="sm:col-span-2">
              <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Month
              </span>
              <input
                type="month"
                value={month}
                onChange={(event) => setMonth(event.target.value)}
                className="mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200"
              />
            </label>
          ) : (
            <label className="sm:col-span-2">
              <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Year
              </span>
              <input
                type="number"
                min={2000}
                max={2100}
                value={year}
                onChange={(event) => setYear(event.target.value)}
                className="mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200"
              />
            </label>
          )}
        </div>
      </header>

      {error ? (
        <p
          className="mt-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <article className="rounded-lg border border-zinc-200 p-4">
          <p className="text-sm font-medium text-zinc-500">Total Rent Income</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">
            {formatCurrency(totalIncome)}
          </p>
        </article>
        <article className="rounded-lg border border-zinc-200 p-4">
          <p className="text-sm font-medium text-zinc-500">Total Expenses</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">
            {formatCurrency(totalExpenses)}
          </p>
        </article>
        <article className="rounded-lg border border-zinc-200 p-4">
          <p className="text-sm font-medium text-zinc-500">
            Net Operating Income
          </p>
          <p
            className={`mt-2 text-2xl font-semibold ${
              netOperatingIncome >= 0 ? "text-emerald-700" : "text-red-700"
            }`}
          >
            {formatCurrency(netOperatingIncome)}
          </p>
        </article>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <article className="rounded-lg border border-zinc-200 p-4">
          <header>
            <h3 className="text-sm font-semibold text-zinc-900">
              Income vs expenses by month
            </h3>
            <p className="mt-1 text-sm text-zinc-500">
              {isLoading ? "Loading..." : "Based on rent payments and logged expenses."}
            </p>
          </header>
          <div className="mt-4 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis
                  tickFormatter={(value) => `$${Number(value) / 1000}k`}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value))}
                  labelClassName="text-zinc-900"
                />
                <Legend />
                <Bar dataKey="income" name="Income" fill="#059669" radius={[4, 4, 0, 0]} />
                <Bar
                  dataKey="expenses"
                  name="Expenses"
                  fill="#dc2626"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="rounded-lg border border-zinc-200 p-4">
          <h3 className="text-sm font-semibold text-zinc-900">
            Expenses by category
          </h3>
          {expensesByCategory.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500">
              No expenses logged for this period.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-zinc-100">
              {expensesByCategory.map((row) => (
                <li
                  key={row.category}
                  className="flex items-center justify-between gap-4 py-3 text-sm"
                >
                  <span className="text-zinc-600">{row.category}</span>
                  <span className="font-medium text-zinc-900">
                    {formatCurrency(row.total)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>
    </section>
  );
}
