"use client";

import { useState, useTransition, type FormEvent } from "react";
import {
  createMaintenanceRequest,
  type MaintenanceInput,
} from "@/app/actions/maintenance";
import type { MaintenanceRequest, Property } from "@/types";

type MaintenanceFormProps = {
  properties: Property[];
  onCreated: (request: MaintenanceRequest) => void;
};

export function MaintenanceForm({
  properties,
  onCreated,
}: MaintenanceFormProps) {
  const [propertyId, setPropertyId] = useState(properties[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!propertyId) {
      setError("Select a property.");
      return;
    }
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }

    const input: MaintenanceInput = {
      propertyId,
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
    };

    startTransition(async () => {
      const result = await createMaintenanceRequest(input);

      if (!result.success) {
        setError(result.error);
        return;
      }

      onCreated(result.data);
      setTitle("");
      setDescription("");
      setPriority("medium");
    });
  }

  if (properties.length === 0) {
    return (
      <section className="rounded-lg border border-dashed border-zinc-300 bg-white p-6 text-center shadow-sm">
        <p className="text-sm font-medium text-zinc-900">No properties yet</p>
        <p className="mt-1 text-sm text-zinc-500">
          Add a property before logging maintenance.
        </p>
      </section>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm"
    >
      <h2 className="text-sm font-semibold text-zinc-900">New request</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Log repairs, inspections, or vendor work.
      </p>

      <fieldset className="mt-6 space-y-4" disabled={isPending}>
        <label className="block">
          <span className="text-sm font-medium text-zinc-700">Property</span>
          <select
            value={propertyId}
            onChange={(e) => setPropertyId(e.target.value)}
            className="mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 disabled:opacity-60"
          >
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.formattedAddress}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-zinc-700">Title</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Leaking kitchen faucet"
            className="mt-1.5 w-full rounded-md border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 disabled:opacity-60"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-zinc-700">Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Additional details for you or your vendor…"
            className="mt-1.5 w-full resize-none rounded-md border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 disabled:opacity-60"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-zinc-700">Priority</span>
          <select
            value={priority}
            onChange={(e) =>
              setPriority(e.target.value as "low" | "medium" | "high")
            }
            className="mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 disabled:opacity-60"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
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
        {isPending ? "Saving…" : "Create request"}
      </button>
    </form>
  );
}
