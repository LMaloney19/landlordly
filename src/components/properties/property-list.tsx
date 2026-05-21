"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { PropertyEditForm } from "@/components/properties/property-edit-form";
import { formatBedrooms } from "@/lib/bedrooms";
import { signedOutSaveMessage } from "@/lib/dev-bypass";
import { getPropertyAddressLines } from "@/lib/properties";
import { createClient } from "@/lib/supabase/client";
import { cn, formatCurrency } from "@/lib/utils";
import type { Property } from "@/types";

type PropertyListProps = {
  properties: Property[];
  onDeleted: (id: string) => void;
  onUpdated: (property: Property) => void;
};

export function PropertyList({
  properties,
  onDeleted,
  onUpdated,
}: PropertyListProps) {
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleDelete(property: Property) {
    const address = property.formattedAddress || property.addressLine1;
    const confirmed = confirm(
      `Archive "${address}"?\n\nThis hides the building from active lists without permanently deleting its records.`,
    );
    if (!confirmed) return;

    setError(null);
    startTransition(async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError(signedOutSaveMessage());
        return;
      }

      const { error: archiveError } = await supabase
        .from("properties")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", property.id)
        .eq("user_id", user.id);

      if (archiveError) {
        setError(
          archiveError.message.includes("archived_at")
            ? "Archive column missing. Run supabase/migrations/20250515900000_archive_records.sql in Supabase."
            : archiveError.message,
        );
        return;
      }
      setEditingId((current) => (current === property.id ? null : current));
      onDeleted(property.id);
    });
  }

  if (properties.length === 0) {
    return (
      <section className="rounded-lg border border-dashed border-zinc-300 bg-white p-12 text-center">
        <p className="text-sm font-medium text-zinc-900">No buildings yet</p>
        <p className="mt-2 text-sm text-zinc-500">
          Add your first property using the form.
        </p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
      <header className="border-b border-zinc-200 px-6 py-4">
        <h2 className="text-sm font-semibold text-zinc-900">All buildings</h2>
        <p className="mt-0.5 text-sm text-zinc-500">
          {properties.length}{" "}
          {properties.length === 1 ? "building" : "buildings"}
        </p>
      </header>

      {error ? (
        <p
          className="border-b border-amber-200 bg-amber-50 px-6 py-3 text-sm text-amber-800"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <ul className="divide-y divide-zinc-100">
        {properties.map((property) => {
          const addressLines = getPropertyAddressLines(property);
          const isEditing = editingId === property.id;

          return (
            <li key={property.id} className="px-6 py-4">
              <div className="flex items-start justify-between gap-4">
                <address className="not-italic">
                  {addressLines.map((line) => (
                    <p key={line} className="text-sm font-medium text-zinc-900">
                      {line}
                    </p>
                  ))}
                  <p className="mt-1 text-sm text-zinc-500">
                    {property.unitCount}{" "}
                    {property.unitCount === 1 ? "unit" : "units"} ·{" "}
                    {formatCurrency(property.totalMonthlyRent)}/mo total
                  </p>
                </address>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      setEditingId(isEditing ? null : property.id)
                    }
                    className={cn(
                      "rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 disabled:opacity-50",
                      isEditing && "bg-zinc-100 text-zinc-900",
                    )}
                    aria-label={
                      isEditing
                        ? `Close edit for ${property.formattedAddress}`
                        : `Edit ${property.formattedAddress}`
                    }
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleDelete(property)}
                    className="rounded-md p-1.5 text-zinc-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    aria-label={`Archive ${property.formattedAddress}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {isEditing ? (
                <PropertyEditForm
                  property={property}
                  onUpdated={(updated) => {
                    onUpdated(updated);
                    setEditingId(null);
                  }}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <ul className="mt-3 space-y-1.5 rounded-md bg-zinc-50 px-3 py-2">
                  {property.units.map((unit) => (
                    <li
                      key={unit.id}
                      className="flex justify-between text-sm text-zinc-700"
                    >
                      <span>
                        Apartment {unit.unitLabel}
                        <span className="text-zinc-500">
                          {" · "}
                          {formatBedrooms(unit.bedrooms)}
                        </span>
                      </span>
                      <span className="font-medium text-zinc-900">
                        {formatCurrency(unit.monthlyRent)}/mo
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
