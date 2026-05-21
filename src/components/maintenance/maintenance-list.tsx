"use client";

import { useTransition } from "react";
import { updateMaintenanceStatus } from "@/app/actions/maintenance";
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
} from "@/lib/maintenance";
import { cn } from "@/lib/utils";
import type { MaintenanceRequest, MaintenanceStatus } from "@/types";

type MaintenanceListProps = {
  requests: MaintenanceRequest[];
  onUpdated: (request: MaintenanceRequest) => void;
};

const statusStyles: Record<MaintenanceStatus, string> = {
  open: "bg-amber-50 text-amber-700",
  in_progress: "bg-blue-50 text-blue-700",
  resolved: "bg-emerald-50 text-emerald-700",
};

const priorityStyles = {
  low: "text-zinc-500",
  medium: "text-zinc-700",
  high: "text-red-600",
};

function formatCreatedAt(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function MaintenanceList({ requests, onUpdated }: MaintenanceListProps) {
  const [isPending, startTransition] = useTransition();

  function handleStatusChange(id: string, status: MaintenanceStatus) {
    startTransition(async () => {
      const result = await updateMaintenanceStatus(id, status);
      if (result.success) {
        onUpdated(result.data);
      }
    });
  }

  if (requests.length === 0) {
    return (
      <section className="rounded-lg border border-dashed border-zinc-300 bg-white p-12 text-center shadow-sm">
        <p className="text-sm font-medium text-zinc-900">No requests yet</p>
        <p className="mt-2 text-sm text-zinc-500">
          Create your first maintenance request using the form.
        </p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
      <header className="border-b border-zinc-200 px-6 py-4">
        <h2 className="text-sm font-semibold text-zinc-900">All requests</h2>
        <p className="mt-0.5 text-sm text-zinc-500">
          {requests.length} {requests.length === 1 ? "request" : "requests"}
        </p>
      </header>
      <ul className="divide-y divide-zinc-100">
        {requests.map((request) => (
          <li
            key={request.id}
            className="px-6 py-4 transition-colors hover:bg-zinc-50/80"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <section className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-zinc-900">
                    {request.title}
                  </p>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      statusStyles[request.status],
                    )}
                  >
                    {STATUS_LABELS[request.status]}
                  </span>
                  <span
                    className={cn(
                      "text-xs font-medium",
                      priorityStyles[request.priority],
                    )}
                  >
                    {PRIORITY_LABELS[request.priority]} priority
                  </span>
                </div>
                <p className="mt-1 text-sm text-zinc-500">
                  {request.propertyAddress} · {formatCreatedAt(request.createdAt)}
                </p>
                {request.description ? (
                  <p className="mt-2 text-sm text-zinc-600">
                    {request.description}
                  </p>
                ) : null}
              </section>

              <label className="shrink-0">
                <span className="sr-only">Update status</span>
                <select
                  value={request.status}
                  disabled={isPending}
                  onChange={(e) =>
                    handleStatusChange(
                      request.id,
                      e.target.value as MaintenanceStatus,
                    )
                  }
                  className="rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 disabled:opacity-60"
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              </label>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
