"use client";

import {
  Building2,
  ChevronDown,
  DoorOpen,
  FileText,
  ImageIcon,
} from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { getExpenseReceiptUrl } from "@/app/actions/expenses";
import {
  EXPENSE_WHOLE_PROPERTY_LABEL,
  formatExpenseUnitTitle,
  type ExpensePropertyGroup,
  type ExpenseUnitGroup,
} from "@/lib/expenses";
import { isImageMimeType } from "@/lib/expense-receipts";
import { cn, formatCurrency } from "@/lib/utils";
import type { Expense } from "@/types";

type ExpensesGroupedListProps = {
  groups: ExpensePropertyGroup[];
  collapseKey?: string;
};

function formatDate(isoDate: string) {
  return new Date(isoDate + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function ReceiptButton({ expense }: { expense: Expense }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!expense.receiptPath) return null;

  const isImage = isImageMimeType(expense.receiptMimeType);

  function openReceipt() {
    setError(null);
    startTransition(async () => {
      const result = await getExpenseReceiptUrl(expense.receiptPath!);
      if (!result.success) {
        setError(result.error);
        return;
      }
      window.open(result.data, "_blank", "noopener,noreferrer");
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={isPending}
        onClick={(event) => {
          event.stopPropagation();
          openReceipt();
        }}
        className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
      >
        {isImage ? (
          <ImageIcon className="h-3.5 w-3.5" aria-hidden />
        ) : (
          <FileText className="h-3.5 w-3.5" aria-hidden />
        )}
        {isPending ? "Opening…" : "View receipt"}
      </button>
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </div>
  );
}

function ExpenseCard({ expense }: { expense: Expense }) {
  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-900">{expense.vendor}</p>
          <p className="mt-0.5 text-xs text-zinc-500">
            {formatDate(expense.date)} · {expense.category}
          </p>
        </div>
        <p className="shrink-0 text-sm font-semibold tabular-nums text-zinc-900">
          {formatCurrency(expense.amount)}
        </p>
      </div>
      {expense.notes ? (
        <p className="mt-2 text-sm text-zinc-600">{expense.notes}</p>
      ) : null}
      <div className="mt-3">
        <ReceiptButton expense={expense} />
      </div>
    </article>
  );
}

function UnitSection({ unit }: { unit: ExpenseUnitGroup }) {
  const isWholeProperty = unit.unitLabel === EXPENSE_WHOLE_PROPERTY_LABEL;

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50/50">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg",
              isWholeProperty
                ? "bg-zinc-100 text-zinc-500"
                : "bg-white text-zinc-700 ring-1 ring-zinc-200",
            )}
          >
            <DoorOpen className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
              {isWholeProperty ? "Property-wide" : "Apartment / unit"}
            </p>
            <p className="text-sm font-semibold text-zinc-900">
              {formatExpenseUnitTitle(unit.unitLabel)}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
            Unit total
          </p>
          <p className="text-sm font-semibold tabular-nums text-zinc-900">
            {formatCurrency(unit.unitTotal)}
          </p>
        </div>
      </div>

      {unit.expenses.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-zinc-400">No expenses in this unit</p>
      ) : (
        <ul className="space-y-3 p-3">
          {unit.expenses.map((expense) => (
            <li key={expense.id}>
              <ExpenseCard expense={expense} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ExpensesGroupedList({
  groups,
  collapseKey = "",
}: ExpensesGroupedListProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setExpandedIds(new Set());
  }, [collapseKey]);

  function toggleProperty(propertyId: string) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(propertyId)) {
        next.delete(propertyId);
      } else {
        next.add(propertyId);
      }
      return next;
    });
  }

  function expandAll() {
    setExpandedIds(new Set(groups.map((group) => group.propertyId)));
  }

  function collapseAll() {
    setExpandedIds(new Set());
  }

  if (groups.length === 0) {
    return null;
  }

  const allExpanded =
    groups.length > 0 && groups.every((group) => expandedIds.has(group.propertyId));

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-zinc-500">
          Expand a property to see units and expenses. Property total includes all units.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={expandAll}
            disabled={allExpanded}
            className="rounded-md border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-40"
          >
            Expand all
          </button>
          <button
            type="button"
            onClick={collapseAll}
            disabled={expandedIds.size === 0}
            className="rounded-md border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-40"
          >
            Collapse all
          </button>
        </div>
      </div>

      <ul className="space-y-3">
        {groups.map((property) => {
          const isExpanded = expandedIds.has(property.propertyId);
          const expenseCount = property.units.reduce(
            (sum, unit) => sum + unit.expenses.length,
            0,
          );

          return (
            <li
              key={property.propertyId}
              className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm"
            >
              <button
                type="button"
                onClick={() => toggleProperty(property.propertyId)}
                className="flex w-full items-start gap-4 px-4 py-4 text-left transition-colors hover:bg-zinc-50/80 sm:px-5"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white">
                  <Building2 className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                    Property
                  </p>
                  <p className="mt-0.5 text-base font-semibold text-zinc-900">
                    {property.propertyAddress}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700">
                      {property.units.length} unit{property.units.length === 1 ? "" : "s"}
                    </span>
                    <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700">
                      {expenseCount} expense{expenseCount === 1 ? "" : "s"}
                    </span>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-100">
                      Property total {formatCurrency(property.propertyTotal)}
                    </span>
                  </div>
                </div>
                <ChevronDown
                  className={cn(
                    "mt-2 h-5 w-5 shrink-0 text-zinc-400 transition-transform",
                    isExpanded && "rotate-180",
                  )}
                  aria-hidden
                />
              </button>

              {isExpanded ? (
                <div className="space-y-3 border-t border-zinc-100 bg-zinc-50/40 px-4 py-4 sm:px-5">
                  {property.units.map((unit) => (
                    <UnitSection
                      key={`${property.propertyId}-${unit.unitLabel}`}
                      unit={unit}
                    />
                  ))}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
