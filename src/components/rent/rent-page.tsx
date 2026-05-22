"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { RentAlertsPanel } from "@/components/rent/rent-alerts-panel";
import { RentPaymentForm } from "@/components/rent/rent-payment-form";
import { RentPaymentList } from "@/components/rent/rent-payment-list";
import { buildRentAlerts } from "@/lib/rent-status";
import type { Property, RentPayment, Tenant } from "@/types";

type RentPageProps = {
  properties: Property[];
  tenants: Tenant[];
  initialPayments: RentPayment[];
  loadError?: string;
};

export function RentPageClient({
  properties,
  tenants,
  initialPayments,
  loadError,
}: RentPageProps) {
  const [payments, setPayments] = useState<RentPayment[]>(initialPayments);

  const rentAlerts = useMemo(
    () => buildRentAlerts(tenants, properties, payments),
    [tenants, properties, payments],
  );

  return (
    <>
      <PageHeader
        title="Rent"
        description="Track who's paid, who's overdue, and record payments by tenant."
      />

      {loadError ? (
        <p
          className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
          role="alert"
        >
          {loadError}
        </p>
      ) : null}

      <section className="mb-6">
        <RentAlertsPanel
          overdue={rentAlerts.overdue}
          dueSoon={rentAlerts.dueSoon}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,360px)_1fr]">
        <RentPaymentForm
          properties={properties}
          tenants={tenants}
          onCreated={(payment) =>
            setPayments((current) => [payment, ...current])
          }
        />
        <RentPaymentList payments={payments} />
      </section>
    </>
  );
}
