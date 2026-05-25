"use client";

import { Building2, ChevronDown, DoorOpen, History } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  formatMaintenanceUnitTitle,
  PRIORITY_LABELS,
  type MaintenancePropertyGroup,
} from "@/lib/maintenance";
import { cn } from "@/lib/utils";
import type { MaintenanceRequest } from "@/types";

type MaintenanceHistoryGroupedProps = {
  groups: MaintenancePropertyGroup[];
  /** When set, only one property is shown (no property-level headers). */
  singleProperty?: boolean;
  /** Outer collapsible wrapper (maintenance tab). */
  collapsible?: boolean;
  collapseKey?: string;
  emptyMessage?: string;
};

function formatHistoryDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function HistoryRequestRow({ request }: { request: MaintenanceRequest }) {
  const resolvedLabel = request.resolvedAt
    ? formatHistoryDate(request.resolvedAt)
    : formatHistoryDate(request.createdAt);

  return (
    <li className="rounded-md border border-zinc-200 bg-white px-4 py-3 text-sm shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="font-medium text-zinc-900">{request.title}</p>
        <span className="text-xs font-medium text-zinc-500">
          {PRIORITY_LABELS[request.priority]} priority
        </span>
      </div>
      <p className="mt-1 text-xs text-zinc-500">Resolved {resolvedLabel}</p>
      {request.description ? (
        <p className="mt-2 text-zinc-600">{request.description}</p>
      ) : null}
    </li>
  );
}

function unitExpandKey(propertyId: string, unitLabel: string) {
  return `${propertyId}::${unitLabel}`;
}

export function MaintenanceHistoryGrouped({
  groups,
  singleProperty = false,
  collapsible = false,
  collapseKey = "",
  emptyMessage = "No resolved maintenance yet.",
}: MaintenanceHistoryGroupedProps) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [expandedPropertyIds, setExpandedPropertyIds] = useState<Set<string>>(
    new Set(),
  );
  const [expandedUnitKeys, setExpandedUnitKeys] = useState<Set<string>>(new Set());

  const totalCount = useMemo(
    () => groups.reduce((sum, group) => sum + group.requestCount, 0),
    [groups],
  );

  useEffect(() => {
    setExpandedPropertyIds(new Set());
    setExpandedUnitKeys(new Set());
    if (singleProperty && groups.length === 1) {
      setExpandedPropertyIds(new Set([groups[0].propertyId]));
    }
  }, [collapseKey, singleProperty, groups]);

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

  const content =
    totalCount === 0 ? (
      <p className="px-6 py-8 text-center text-sm text-zinc-500">{emptyMessage}</p>
    ) : (
      <div className="space-y-3 px-4 py-4 sm:px-6">
        {groups.map((property) => {
          const propertyExpanded =
            singleProperty || expandedPropertyIds.has(property.propertyId);

          return (
            <div key={property.propertyId} className="space-y-2">
              {!singleProperty ? (
                <button
                  type="button"
                  onClick={() => toggleProperty(property.propertyId)}
                  aria-expanded={propertyExpanded}
                  className="flex w-full items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-left transition-colors hover:bg-zinc-50/80"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700">
                      <Building2 className="h-4 w-4" aria-hidden />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">
                        {property.propertyAddress}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {property.requestCount}{" "}
                        {property.requestCount === 1 ? "request" : "requests"}
                      </p>
                    </div>
                  </div>
                  <ChevronDown
                    className={cn(
                      "h-5 w-5 shrink-0 text-zinc-400 transition-transform",
                      propertyExpanded && "rotate-180",
                    )}
                    aria-hidden
                  />
                </button>
              ) : null}

              {propertyExpanded ? (
                <div className="space-y-2 pl-0 sm:pl-2">
                  {property.units.map((unit) => {
                    const key = unitExpandKey(property.propertyId, unit.unitLabel);
                    const unitExpanded = expandedUnitKeys.has(key);

                    return (
                      <div
                        key={key}
                        className="overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50/50"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            toggleUnit(property.propertyId, unit.unitLabel)
                          }
                          aria-expanded={unitExpanded}
                          className="flex w-full items-center justify-between gap-3 border-b border-zinc-200 bg-white px-4 py-3 text-left transition-colors hover:bg-zinc-50/80"
                        >
                          <div className="flex min-w-0 flex-1 items-center gap-3">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-zinc-700 ring-1 ring-zinc-200">
                              <DoorOpen className="h-4 w-4" aria-hidden />
                            </span>
                            <div>
                              <p className="text-sm font-semibold text-zinc-900">
                                {formatMaintenanceUnitTitle(unit.unitLabel)}
                              </p>
                              <p className="text-xs text-zinc-500">
                                {unit.requests.length}{" "}
                                {unit.requests.length === 1 ? "item" : "items"}
                              </p>
                            </div>
                          </div>
                          <ChevronDown
                            className={cn(
                              "h-5 w-5 shrink-0 text-zinc-400 transition-transform",
                              unitExpanded && "rotate-180",
                            )}
                            aria-hidden
                          />
                        </button>
                        {unitExpanded ? (
                          <ul className="space-y-2 p-3">
                            {unit.requests.map((request) => (
                              <HistoryRequestRow key={request.id} request={request} />
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    );

  if (!collapsible) {
    return content;
  }

  return (
    <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setHistoryOpen((open) => !open)}
        aria-expanded={historyOpen}
        className="flex w-full items-center justify-between gap-3 border-b border-zinc-200 px-6 py-4 text-left transition-colors hover:bg-zinc-50/80"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700">
            <History className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">History</h2>
            <p className="text-sm text-zinc-500">
              Resolved requests by property and unit · {totalCount}{" "}
              {totalCount === 1 ? "item" : "items"}
            </p>
          </div>
        </div>
        <ChevronDown
          className={cn(
            "h-5 w-5 shrink-0 text-zinc-400 transition-transform",
            historyOpen && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      {historyOpen ? content : null}
    </section>
  );
}
