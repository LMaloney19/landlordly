"use client";

import Link from "next/link";
import {
  Building2,
  CalendarClock,
  ChevronDown,
  DoorOpen,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  formatRentAlertUnitTitle,
  rentStatusBadgeClass,
  rentStatusLabel,
  type RentAlertPropertyGroup,
  type RentAlertUnitGroup,
} from "@/lib/rent-status";
import { cn, formatCurrency } from "@/lib/utils";
import type { RentAlert } from "@/types";

type RentAlertsGroupedPanelProps = {
  groups: RentAlertPropertyGroup[];
  collapseKey?: string;
};

function formatDueDate(isoDate: string) {
  return new Date(isoDate + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function AlertRow({ alert }: { alert: RentAlert }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm shadow-sm">
      <div className="min-w-0">
        <p className="font-medium text-zinc-900">{alert.tenantName}</p>
        <p className="mt-0.5 text-xs text-zinc-500">
          Due {formatDueDate(alert.dueDate)} · {formatCurrency(alert.balanceDue)}{" "}
          owed
        </p>
      </div>
      <span
        className={cn(
          "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ring-1",
          rentStatusBadgeClass(alert.status),
        )}
      >
        {rentStatusLabel(alert.status, alert.daysUntilDue)}
      </span>
    </li>
  );
}

function UnitSection({
  propertyId,
  unit,
  isExpanded,
  onToggle,
}: {
  propertyId: string;
  unit: RentAlertUnitGroup;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50/50">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        className="flex w-full items-center justify-between gap-3 border-b border-zinc-200 bg-white px-4 py-3 text-left transition-colors hover:bg-zinc-50/80"
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-zinc-700 ring-1 ring-zinc-200">
            <DoorOpen className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
              Apartment / unit
            </p>
            <p className="text-sm font-semibold text-zinc-900">
              {formatRentAlertUnitTitle(unit.unitLabel)}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {unit.overdueCount > 0 ? (
                <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-800 ring-1 ring-red-100">
                  {unit.overdueCount} overdue
                </span>
              ) : null}
              {unit.dueSoonCount > 0 ? (
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-amber-100">
                  {unit.dueSoonCount} due soon
                </span>
              ) : null}
            </div>
          </div>
        </div>
        <ChevronDown
          className={cn(
            "h-5 w-5 shrink-0 text-zinc-400 transition-transform",
            isExpanded && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      {isExpanded ? (
        <ul className="space-y-2 p-3">
          {unit.alerts.map((alert) => (
            <AlertRow key={`${propertyId}-${alert.tenantId}-${alert.status}`} alert={alert} />
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function unitExpandKey(propertyId: string, unitLabel: string) {
  return `${propertyId}::${unitLabel}`;
}

export function RentAlertsGroupedPanel({
  groups,
  collapseKey = "",
}: RentAlertsGroupedPanelProps) {
  const [expandedPropertyIds, setExpandedPropertyIds] = useState<Set<string>>(
    new Set(),
  );
  const [expandedUnitKeys, setExpandedUnitKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    setExpandedPropertyIds(new Set());
    setExpandedUnitKeys(new Set());
  }, [collapseKey]);

  function toggleProperty(propertyId: string) {
    setExpandedPropertyIds((current) => {
      const next = new Set(current);
      if (next.has(propertyId)) next.delete(propertyId);
      else next.add(propertyId);
      return next;
    });
  }

  function toggleUnit(propertyId: string, unitLabel: string) {
    const key = unitExpandKey(propertyId, unitLabel);
    setExpandedUnitKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  if (groups.length === 0) return null;

  const totalAlerts = groups.reduce((sum, group) => sum + group.alertCount, 0);
  const totalOverdue = groups.reduce((sum, group) => sum + group.overdueCount, 0);
  const totalDueSoon = groups.reduce((sum, group) => sum + group.dueSoonCount, 0);

  return (
    <section className="mb-6 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
            <CalendarClock className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Rent reminders</h2>
            <p className="text-sm text-zinc-500">
              {totalOverdue > 0 ? `${totalOverdue} overdue` : "No overdue"}
              {totalDueSoon > 0
                ? `${totalOverdue > 0 ? " · " : ""}${totalDueSoon} due soon`
                : ""}
              {" · "}
              {totalAlerts} tenant{totalAlerts === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        <Link
          href="/rent"
          className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900"
        >
          Record payment
        </Link>
      </header>

      <div className="space-y-3 p-4 sm:p-6">
        {groups.map((property) => {
          const isPropertyExpanded = expandedPropertyIds.has(property.propertyId);

          return (
            <div
              key={property.propertyId}
              className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm"
            >
              <button
                type="button"
                onClick={() => toggleProperty(property.propertyId)}
                aria-expanded={isPropertyExpanded}
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
                    {property.overdueCount > 0 ? (
                      <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-800 ring-1 ring-red-100">
                        {property.overdueCount} overdue
                      </span>
                    ) : null}
                    {property.dueSoonCount > 0 ? (
                      <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 ring-1 ring-amber-100">
                        {property.dueSoonCount} due soon
                      </span>
                    ) : null}
                    <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700">
                      {property.units.length} unit
                      {property.units.length === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>
                <ChevronDown
                  className={cn(
                    "mt-2 h-5 w-5 shrink-0 text-zinc-400 transition-transform",
                    isPropertyExpanded && "rotate-180",
                  )}
                  aria-hidden
                />
              </button>

              {isPropertyExpanded ? (
                <div className="space-y-3 border-t border-zinc-100 bg-zinc-50/40 px-4 py-4 sm:px-5">
                  {property.units.map((unit) => {
                    const key = unitExpandKey(property.propertyId, unit.unitLabel);
                    return (
                      <UnitSection
                        key={key}
                        propertyId={property.propertyId}
                        unit={unit}
                        isExpanded={expandedUnitKeys.has(key)}
                        onToggle={() =>
                          toggleUnit(property.propertyId, unit.unitLabel)
                        }
                      />
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
