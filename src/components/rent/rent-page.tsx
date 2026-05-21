"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { RentPaymentForm } from "@/components/rent/rent-payment-form";
import { RentPaymentList } from "@/components/rent/rent-payment-list";
import type { Property, RentPayment } from "@/types";

type RentPageProps = {
  properties: Property[];
  initialPayments: RentPayment[];
  loadError?: string;
};

export function RentPageClient({
  properties,
  initialPayments,
  loadError,
}: RentPageProps) {
  const [payments, setPayments] = useState<RentPayment[]>(initialPayments);

  return (
    <>
      <PageHeader
        title="Rent"
        description="Record payments and review rent collected across your portfolio."
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
        <RentPaymentForm
          properties={properties}
          onCreated={(payment) =>
            setPayments((current) => [payment, ...current])
          }
        />
        <RentPaymentList payments={payments} />
      </section>
    </>
  );
}
