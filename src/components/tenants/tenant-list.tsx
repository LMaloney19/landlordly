"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { signedOutSaveMessage } from "@/lib/dev-bypass";
import { PROPERTY_ADDRESS_SELECT } from "@/lib/properties";
import { createClient } from "@/lib/supabase/client";
import { daysUntil, rowToTenant, type TenantRow } from "@/lib/tenants";
import { formatCurrency } from "@/lib/utils";
import type { Property, Tenant } from "@/types";

type TenantListProps = {
  tenants: Tenant[];
  properties: Property[];
  onDeleted: (id: string) => void;
  onUpdated: (tenant: Tenant) => void;
};

type TenantEditDraft = {
  propertyId: string;
  name: string;
  email: string;
  phone: string;
  unitLabel: string;
  leaseStart: string;
  leaseEnd: string;
  monthlyRent: string;
};

function formatDate(isoDate: string) {
  return new Date(isoDate + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function leaseBadge(days: number) {
  if (days < 0) {
    return { label: "Expired", className: "text-red-600" };
  }
  if (days <= 60) {
    return { label: `${days} days left`, className: "text-amber-600" };
  }
  return { label: `${days} days left`, className: "text-zinc-500" };
}

function draftFromTenant(tenant: Tenant): TenantEditDraft {
  return {
    propertyId: tenant.propertyId,
    name: tenant.name,
    email: tenant.email ?? "",
    phone: tenant.phone ?? "",
    unitLabel: tenant.unitLabel ?? "",
    leaseStart: tenant.leaseStart ?? "",
    leaseEnd: tenant.leaseEnd,
    monthlyRent:
      tenant.monthlyRent !== null && tenant.monthlyRent !== undefined
        ? String(tenant.monthlyRent)
        : "",
  };
}

const inputClass =
  "mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 disabled:opacity-60";

export function TenantList({
  tenants,
  properties,
  onDeleted,
  onUpdated,
}: TenantListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<TenantEditDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedProperty = useMemo(
    () => properties.find((property) => property.id === draft?.propertyId),
    [draft?.propertyId, properties],
  );

  function startEditing(tenant: Tenant) {
    setError(null);
    setEditingId(tenant.id);
    setDraft(draftFromTenant(tenant));
  }

  function updateDraft(patch: Partial<TenantEditDraft>) {
    setDraft((current) => (current ? { ...current, ...patch } : current));
  }

  function handlePropertyChange(propertyId: string) {
    const property = properties.find((p) => p.id === propertyId);
    const unit = property?.units[0];
    updateDraft({
      propertyId,
      unitLabel: unit?.unitLabel ?? "",
      monthlyRent: unit ? String(unit.monthlyRent) : "",
    });
  }

  function handleUnitChange(unitLabel: string) {
    const unit = selectedProperty?.units.find((u) => u.unitLabel === unitLabel);
    updateDraft({
      unitLabel,
      ...(unit ? { monthlyRent: String(unit.monthlyRent) } : {}),
    });
  }

  function handleDelete(tenant: Tenant) {
    const confirmed = confirm(
      `Archive tenant "${tenant.name}"?\n\nThis hides the tenant from the active list but does not permanently delete their record.`,
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

      const { error: deleteError } = await supabase
        .from("tenants")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", tenant.id)
        .eq("user_id", user.id);

      if (deleteError) {
        setError(
          deleteError.message.includes("archived_at")
            ? "Archive column missing. Run supabase/migrations/20250515900000_archive_records.sql in Supabase."
            : deleteError.message,
        );
        return;
      }

      if (editingId === tenant.id) {
        setEditingId(null);
        setDraft(null);
      }
      onDeleted(tenant.id);
    });
  }

  function handleSave(event: FormEvent<HTMLFormElement>, tenantId: string) {
    event.preventDefault();
    if (!draft) return;

    const name = draft.name.trim();
    if (!name) {
      setError("Tenant name is required.");
      return;
    }
    if (!draft.propertyId) {
      setError("Property is required.");
      return;
    }
    if (!draft.leaseEnd) {
      setError("Lease end is required.");
      return;
    }
    if (draft.leaseStart && draft.leaseEnd < draft.leaseStart) {
      setError("Lease end must be on or after lease start.");
      return;
    }

    const monthlyRent = draft.monthlyRent ? Number(draft.monthlyRent) : null;
    if (
      draft.monthlyRent &&
      (!Number.isFinite(monthlyRent) || monthlyRent === null || monthlyRent <= 0)
    ) {
      setError("Monthly rent must be greater than 0.");
      return;
    }

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

      const { data, error: updateError } = await supabase
        .from("tenants")
        .update({
          property_id: draft.propertyId,
          name,
          email: draft.email.trim() || null,
          phone: draft.phone.trim() || null,
          unit_label: draft.unitLabel.trim() || null,
          lease_start: draft.leaseStart || null,
          lease_end: draft.leaseEnd,
          monthly_rent: monthlyRent,
        })
        .eq("id", tenantId)
        .eq("user_id", user.id)
        .select(`*, properties(${PROPERTY_ADDRESS_SELECT})`)
        .single();

      if (updateError || !data) {
        setError(updateError?.message ?? "Tenant could not be updated.");
        return;
      }

      onUpdated(rowToTenant(data as TenantRow));
      setEditingId(null);
      setDraft(null);
    });
  }

  if (tenants.length === 0) {
    return (
      <section className="rounded-lg border border-dashed border-zinc-300 bg-white p-12 text-center shadow-sm">
        <p className="text-sm font-medium text-zinc-900">No tenants yet</p>
        <p className="mt-2 text-sm text-zinc-500">
          Add your first tenant using the form.
        </p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
      <header className="border-b border-zinc-200 px-6 py-4">
        <h2 className="text-sm font-semibold text-zinc-900">All tenants</h2>
        <p className="mt-0.5 text-sm text-zinc-500">
          {tenants.length} {tenants.length === 1 ? "tenant" : "tenants"}
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
        {tenants.map((tenant) => {
          const days = daysUntil(tenant.leaseEnd);
          const badge = leaseBadge(days);
          const rentLabel = tenant.monthlyRent
            ? formatCurrency(tenant.monthlyRent)
            : null;
          const isEditing = editingId === tenant.id && draft;

          return (
            <li
              key={tenant.id}
              className="px-6 py-4 transition-colors hover:bg-zinc-50/80"
            >
              <div className="flex items-start justify-between gap-4">
                <section>
                  <p className="text-sm font-medium text-zinc-900">
                    {tenant.name}
                    {tenant.unitLabel ? (
                      <span className="font-normal text-zinc-500">
                        {" "}
                        · {tenant.unitLabel}
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 text-sm text-zinc-500">
                    {tenant.propertyAddress}
                  </p>
                  {(tenant.email || tenant.phone) && (
                    <p className="mt-1 text-xs text-zinc-500">
                      {[tenant.email, tenant.phone].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </section>
                <section className="shrink-0 text-right">
                  <p className={`text-sm font-medium ${badge.className}`}>
                    {badge.label}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    Ends {formatDate(tenant.leaseEnd)}
                  </p>
                  {rentLabel ? (
                    <p className="mt-1 text-xs text-zinc-700">{rentLabel}/mo</p>
                  ) : null}
                  <div className="mt-3 flex justify-end gap-2">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() =>
                        isEditing
                          ? (setEditingId(null), setDraft(null))
                          : startEditing(tenant)
                      }
                      className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-white disabled:opacity-60"
                    >
                      {isEditing ? "Close" : "Edit"}
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleDelete(tenant)}
                      className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                    >
                      Archive
                    </button>
                  </div>
                </section>
              </div>

              {isEditing ? (
                <form
                  onSubmit={(event) => handleSave(event, tenant.id)}
                  className="mt-4 rounded-md border border-zinc-200 bg-zinc-50/80 p-4"
                >
                  <fieldset className="space-y-4" disabled={isPending}>
                    <label className="block">
                      <span className="text-sm font-medium text-zinc-700">
                        Tenant name
                      </span>
                      <input
                        type="text"
                        value={draft.name}
                        onChange={(e) => updateDraft({ name: e.target.value })}
                        className={inputClass}
                      />
                    </label>

                    <label className="block">
                      <span className="text-sm font-medium text-zinc-700">
                        Property
                      </span>
                      <select
                        value={draft.propertyId}
                        onChange={(e) => handlePropertyChange(e.target.value)}
                        className={inputClass}
                      >
                        {properties.map((property) => (
                          <option key={property.id} value={property.id}>
                            {property.formattedAddress}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="text-sm font-medium text-zinc-700">
                        Apartment
                      </span>
                      {selectedProperty && selectedProperty.units.length > 0 ? (
                        <select
                          value={draft.unitLabel}
                          onChange={(e) => handleUnitChange(e.target.value)}
                          className={inputClass}
                        >
                          <option value="">Select apartment</option>
                          {selectedProperty.units.map((unit) => (
                            <option key={unit.id} value={unit.unitLabel}>
                              {unit.unitLabel}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={draft.unitLabel}
                          onChange={(e) =>
                            updateDraft({ unitLabel: e.target.value })
                          }
                          className={inputClass}
                        />
                      )}
                    </label>

                    <div className="grid grid-cols-2 gap-4">
                      <label className="block">
                        <span className="text-sm font-medium text-zinc-700">
                          Lease start
                        </span>
                        <input
                          type="date"
                          value={draft.leaseStart}
                          onChange={(e) =>
                            updateDraft({ leaseStart: e.target.value })
                          }
                          className={inputClass}
                        />
                      </label>
                      <label className="block">
                        <span className="text-sm font-medium text-zinc-700">
                          Lease end
                        </span>
                        <input
                          type="date"
                          value={draft.leaseEnd}
                          onChange={(e) =>
                            updateDraft({ leaseEnd: e.target.value })
                          }
                          className={inputClass}
                        />
                      </label>
                    </div>

                    <label className="block">
                      <span className="text-sm font-medium text-zinc-700">
                        Email
                      </span>
                      <input
                        type="email"
                        value={draft.email}
                        onChange={(e) => updateDraft({ email: e.target.value })}
                        className={inputClass}
                      />
                    </label>

                    <label className="block">
                      <span className="text-sm font-medium text-zinc-700">
                        Phone
                      </span>
                      <input
                        type="tel"
                        value={draft.phone}
                        onChange={(e) => updateDraft({ phone: e.target.value })}
                        className={inputClass}
                      />
                    </label>

                    <label className="block">
                      <span className="text-sm font-medium text-zinc-700">
                        Monthly rent
                      </span>
                      <input
                        type="number"
                        min={1}
                        step={0.01}
                        value={draft.monthlyRent}
                        onChange={(e) =>
                          updateDraft({ monthlyRent: e.target.value })
                        }
                        className={inputClass}
                      />
                    </label>
                  </fieldset>

                  <div className="mt-4 flex gap-2">
                    <button
                      type="submit"
                      disabled={isPending}
                      className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
                    >
                      {isPending ? "Saving..." : "Save changes"}
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => {
                        setEditingId(null);
                        setDraft(null);
                      }}
                      className="rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-white disabled:opacity-60"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
