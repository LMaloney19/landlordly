"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import type { TenantInput } from "@/app/actions/tenants";
import { signedOutSaveMessage } from "@/lib/dev-bypass";
import { PROPERTY_ADDRESS_SELECT } from "@/lib/properties";
import { createClient } from "@/lib/supabase/client";
import { addDaysIso, rowToTenant, todayIso, type TenantRow } from "@/lib/tenants";
import type { Property, Tenant } from "@/types";

type TenantDraft = {
  key: string;
  name: string;
  email: string;
  phone: string;
  unitLabel: string;
  leaseStart: string;
  leaseEnd: string;
  monthlyRent: string;
  securityDeposit: string;
  petName: string;
  petType: string;
};

function newDraft(unitPreset?: string, rentPreset?: string): TenantDraft {
  return {
    key:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `row-${Math.random().toString(36).slice(2)}`,
    name: "",
    email: "",
    phone: "",
    unitLabel: unitPreset ?? "",
    leaseStart: todayIso(),
    leaseEnd: addDaysIso(365),
    monthlyRent: rentPreset ?? "",
    securityDeposit: "",
    petName: "",
    petType: "",
  };
}

type TenantFormProps = {
  properties: Property[];
  onTenantsAdded: (tenants: Tenant[]) => void;
};

export function TenantForm({ properties, onTenantsAdded }: TenantFormProps) {
  const initialPropertyId = properties[0]?.id ?? "";

  const [propertyId, setPropertyId] = useState(initialPropertyId);

  const selectedProperty = useMemo(
    () => properties.find((p) => p.id === propertyId),
    [properties, propertyId],
  );

  const [rows, setRows] = useState<TenantDraft[]>(() => {
    const p = properties[0];
    const u = p?.units[0];
    return [newDraft(u?.unitLabel, u ? String(u.monthlyRent) : "")];
  });

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handlePropertyChange(nextId: string) {
    setPropertyId(nextId);
    const property = properties.find((p) => p.id === nextId);
    const firstUnit = property?.units[0];
    setRows((prev) =>
      prev.map((row, index) =>
        index === 0 && firstUnit
          ? {
              ...row,
              unitLabel: firstUnit.unitLabel,
              monthlyRent: String(firstUnit.monthlyRent),
            }
          : row,
      ),
    );
  }

  function updateRow(key: string, patch: Partial<TenantDraft>) {
    setRows((prev) =>
      prev.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  }

  function handleUnitChange(rowKey: string, label: string) {
    const unit = selectedProperty?.units.find((u) => u.unitLabel === label);
    updateRow(rowKey, {
      unitLabel: label,
      ...(unit ? { monthlyRent: String(unit.monthlyRent) } : {}),
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!propertyId) {
      setError("Select a property.");
      return;
    }

    const inputs: TenantInput[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const name = row.name.trim();
      if (!name) continue;

      if (
        selectedProperty &&
        selectedProperty.units.length > 0 &&
        !row.unitLabel.trim()
      ) {
        setError(`Select an apartment for row ${i + 1}.`);
        return;
      }

      if (!row.leaseEnd) {
        setError(`Lease end is required for row ${i + 1}.`);
        return;
      }
      if (row.leaseStart && row.leaseEnd < row.leaseStart) {
        setError(
          `Lease end must be on or after lease start (row ${i + 1}).`,
        );
        return;
      }

      const parsedRent = row.monthlyRent ? Number(row.monthlyRent) : undefined;
      if (
        row.monthlyRent &&
        (!Number.isFinite(parsedRent) || parsedRent! <= 0)
      ) {
        setError(`Monthly rent must be greater than 0 (row ${i + 1}).`);
        return;
      }

      const parsedDeposit = row.securityDeposit
        ? Number(row.securityDeposit)
        : undefined;
      if (
        row.securityDeposit &&
        (!Number.isFinite(parsedDeposit) || parsedDeposit! < 0)
      ) {
        setError(`Security deposit must be zero or greater (row ${i + 1}).`);
        return;
      }

      inputs.push({
        propertyId,
        name,
        email: row.email.trim() || undefined,
        phone: row.phone.trim() || undefined,
        unitLabel: row.unitLabel.trim() || undefined,
        leaseStart: row.leaseStart || undefined,
        leaseEnd: row.leaseEnd,
        monthlyRent: parsedRent,
        securityDeposit: parsedDeposit,
        petName: row.petName.trim() || undefined,
        petType: row.petType.trim() || undefined,
      });
    }

    if (inputs.length === 0) {
      setError("Fill at least one tenant name — or add another row.");
      return;
    }

    startTransition(async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError(signedOutSaveMessage());
        return;
      }

      const { data, error: saveError } = await supabase
        .from("tenants")
        .insert(
          inputs.map((input) => ({
            user_id: user.id,
            property_id: input.propertyId,
            name: input.name.trim(),
            email: input.email?.trim() || null,
            phone: input.phone?.trim() || null,
            unit_label: input.unitLabel?.trim() || null,
            lease_start: input.leaseStart || null,
            lease_end: input.leaseEnd,
            monthly_rent: input.monthlyRent ?? null,
            security_deposit: input.securityDeposit ?? null,
            pet_name: input.petName?.trim() || null,
            pet_type: input.petType?.trim() || null,
          })),
        )
        .select(`*, properties(${PROPERTY_ADDRESS_SELECT})`);

      if (saveError) {
        setError(
          saveError.message.includes("relation")
            ? "Tenants table not found. Run the tenants SQL migration in Supabase."
            : saveError.message,
        );
        return;
      }

      if (!data?.length) {
        setError("Tenants saved but could not reload.");
        return;
      }

      onTenantsAdded((data as TenantRow[]).map(rowToTenant));

      const nextFirst = selectedProperty?.units[0];
      setRows([
        newDraft(
          nextFirst?.unitLabel,
          nextFirst ? String(nextFirst.monthlyRent) : "",
        ),
      ]);
    });
  }

  if (properties.length === 0) {
    return (
      <section className="rounded-lg border border-dashed border-zinc-300 bg-white p-6 text-center shadow-sm">
        <p className="text-sm font-medium text-zinc-900">No properties yet</p>
        <p className="mt-1 text-sm text-zinc-500">
          Add a property before adding tenants.
        </p>
      </section>
    );
  }

  const filledCount = rows.filter((r) => r.name.trim()).length;

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm"
    >
      <h2 className="text-sm font-semibold text-zinc-900">Add tenants</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Add one or more tenants for the same building in a single save.
      </p>

      <fieldset className="mt-6 space-y-6" disabled={isPending}>
        <label className="block">
          <span className="text-sm font-medium text-zinc-700">Property</span>
          <select
            value={propertyId}
            onChange={(e) => handlePropertyChange(e.target.value)}
            className="mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 disabled:opacity-60"
          >
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.formattedAddress}
              </option>
            ))}
          </select>
        </label>

        {rows.map((row, index) => (
          <div
            key={row.key}
            className="space-y-4 rounded-lg border border-zinc-100 bg-zinc-50/80 p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Tenant {index + 1}
              </p>
              {rows.length > 1 ? (
                <button
                  type="button"
                  className="text-xs font-medium text-zinc-600 hover:text-zinc-900"
                  onClick={() =>
                    setRows((prev) => prev.filter((r) => r.key !== row.key))
                  }
                >
                  Remove row
                </button>
              ) : null}
            </div>

            <label className="block">
              <span className="text-sm font-medium text-zinc-700">
                Tenant name
              </span>
              <input
                type="text"
                value={row.name}
                onChange={(e) => updateRow(row.key, { name: e.target.value })}
                placeholder="Jane Smith"
                className="mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 disabled:opacity-60"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-zinc-700">Apartment</span>
              {selectedProperty && selectedProperty.units.length > 0 ? (
                <select
                  value={row.unitLabel}
                  onChange={(e) => handleUnitChange(row.key, e.target.value)}
                  className="mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 disabled:opacity-60"
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
                  value={row.unitLabel}
                  onChange={(e) =>
                    updateRow(row.key, { unitLabel: e.target.value })
                  }
                  placeholder="4B"
                  className="mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 disabled:opacity-60"
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
                  value={row.leaseStart}
                  onChange={(e) =>
                    updateRow(row.key, { leaseStart: e.target.value })
                  }
                  className="mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 disabled:opacity-60"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-zinc-700">
                  Lease end
                </span>
                <input
                  type="date"
                  value={row.leaseEnd}
                  onChange={(e) =>
                    updateRow(row.key, { leaseEnd: e.target.value })
                  }
                  className="mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 disabled:opacity-60"
                />
              </label>
            </div>

            <label className="block">
              <span className="text-sm font-medium text-zinc-700">Email</span>
              <input
                type="email"
                value={row.email}
                onChange={(e) => updateRow(row.key, { email: e.target.value })}
                placeholder="jane@email.com"
                className="mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 disabled:opacity-60"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-zinc-700">Phone</span>
              <input
                type="tel"
                value={row.phone}
                onChange={(e) => updateRow(row.key, { phone: e.target.value })}
                placeholder="(555) 123-4567"
                className="mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 disabled:opacity-60"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-zinc-700">
                Monthly rent override (optional)
              </span>
              <input
                type="number"
                min={1}
                step={0.01}
                value={row.monthlyRent}
                onChange={(e) =>
                  updateRow(row.key, { monthlyRent: e.target.value })
                }
                placeholder={
                  selectedProperty
                    ? String(
                        selectedProperty.units.find(
                          (u) => u.unitLabel === row.unitLabel,
                        )?.monthlyRent ??
                          selectedProperty.units[0]?.monthlyRent ??
                          selectedProperty.totalMonthlyRent,
                      )
                    : "1200"
                }
                className="mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 disabled:opacity-60"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-zinc-700">
                Security deposit
              </span>
              <input
                type="number"
                min={0}
                step={0.01}
                value={row.securityDeposit}
                onChange={(e) =>
                  updateRow(row.key, { securityDeposit: e.target.value })
                }
                placeholder="Optional"
                className="mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 disabled:opacity-60"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm font-medium text-zinc-700">Pet name</span>
                <input
                  type="text"
                  value={row.petName}
                  onChange={(e) =>
                    updateRow(row.key, { petName: e.target.value })
                  }
                  placeholder="Optional"
                  className="mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 disabled:opacity-60"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-zinc-700">Pet type</span>
                <input
                  type="text"
                  value={row.petType}
                  onChange={(e) =>
                    updateRow(row.key, { petType: e.target.value })
                  }
                  placeholder="Dog"
                  className="mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 disabled:opacity-60"
                />
              </label>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={() =>
            setRows((prev) => [...prev, newDraft("", "")])
          }
          className="w-full rounded-md border border-dashed border-zinc-300 py-2 text-sm font-medium text-zinc-600 transition-colors hover:border-zinc-400 hover:bg-zinc-50"
        >
          + Add another tenant row
        </button>
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
        {isPending
          ? "Saving…"
          : filledCount > 1
            ? `Save ${filledCount} tenants`
            : "Save tenant"}
      </button>
    </form>
  );
}
