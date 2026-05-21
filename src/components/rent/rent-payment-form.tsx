"use client";

import { useState, useTransition, type FormEvent } from "react";
import { createRentPayment, type RentPaymentInput } from "@/app/actions/rent";
import type { Property, RentPayment } from "@/types";

type RentPaymentFormProps = {
  properties: Property[];
  onCreated: (payment: RentPayment) => void;
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function RentPaymentForm({
  properties,
  onCreated,
}: RentPaymentFormProps) {
  const [propertyId, setPropertyId] = useState(properties[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [paidAt, setPaidAt] = useState(todayIso());
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsedAmount = Number(amount);

    if (!propertyId) {
      setError("Select a property.");
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Amount must be greater than 0.");
      return;
    }
    if (!paidAt) {
      setError("Payment date is required.");
      return;
    }

    const input: RentPaymentInput = {
      propertyId,
      amount: parsedAmount,
      paidAt,
      notes: notes.trim() || undefined,
    };

    startTransition(async () => {
      const result = await createRentPayment(input);

      if (!result.success) {
        setError(result.error);
        return;
      }

      onCreated(result.data);
      setAmount("");
      setNotes("");
      setPaidAt(todayIso());
    });
  }

  if (properties.length === 0) {
    return (
      <section className="rounded-lg border border-dashed border-zinc-300 bg-white p-6 text-center shadow-sm">
        <p className="text-sm font-medium text-zinc-900">No properties yet</p>
        <p className="mt-1 text-sm text-zinc-500">
          Add a property before recording rent payments.
        </p>
      </section>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm"
    >
      <h2 className="text-sm font-semibold text-zinc-900">Record payment</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Log rent received for a property.
      </p>

      <fieldset className="mt-6 space-y-4" disabled={isPending}>
        <label className="block">
          <span className="text-sm font-medium text-zinc-700">Property</span>
          <select
            value={propertyId}
            onChange={(e) => setPropertyId(e.target.value)}
            className="mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 disabled:opacity-60"
          >
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.formattedAddress}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-zinc-700">Amount</span>
          <input
            type="number"
            min={1}
            step={0.01}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="1200"
            className="mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 disabled:opacity-60"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-zinc-700">Paid on</span>
          <input
            type="date"
            value={paidAt}
            onChange={(e) => setPaidAt(e.target.value)}
            className="mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 disabled:opacity-60"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-zinc-700">
            Notes (optional)
          </span>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="January rent"
            className="mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 disabled:opacity-60"
          />
        </label>
      </fieldset>

      {error ? (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="mt-6 w-full rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-60"
      >
        {isPending ? "Saving…" : "Record payment"}
      </button>
    </form>
  );
}
