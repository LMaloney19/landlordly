"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { MaintenanceForm } from "@/components/maintenance/maintenance-form";
import { MaintenanceList } from "@/components/maintenance/maintenance-list";
import type { MaintenanceRequest, Property } from "@/types";

type MaintenancePageProps = {
  properties: Property[];
  initialRequests: MaintenanceRequest[];
  loadError?: string;
};

export function MaintenancePageClient({
  properties,
  initialRequests,
  loadError,
}: MaintenancePageProps) {
  const [requests, setRequests] = useState<MaintenanceRequest[]>(initialRequests);

  function handleCreated(request: MaintenanceRequest) {
    setRequests((current) => [request, ...current]);
  }

  function handleUpdated(updated: MaintenanceRequest) {
    setRequests((current) =>
      current.map((r) => (r.id === updated.id ? updated : r)),
    );
  }

  return (
    <>
      <PageHeader
        title="Maintenance"
        description="Log requests, track status, and resolve issues across your properties."
      />

      {loadError ? (
        <p
          className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
          role="alert"
        >
          {loadError}
        </p>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[minmax(0,360px)_1fr]">
        <MaintenanceForm properties={properties} onCreated={handleCreated} />
        <MaintenanceList requests={requests} onUpdated={handleUpdated} />
      </section>
    </>
  );
}
