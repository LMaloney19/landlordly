"use client";

import { Dog, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { signedOutSaveMessage } from "@/lib/dev-bypass";
import { PROPERTY_ADDRESS_SELECT } from "@/lib/properties";
import { createClient } from "@/lib/supabase/client";
import {
  daysUntil,
  rowToTenant,
  type TenantPropertyGroup,
  type TenantRow,
} from "@/lib/tenants";
import { cn, formatCurrency } from "@/lib/utils";
import type { Tenant } from "@/types";

type TenantsGroupedListProps = {
  groups: TenantPropertyGroup[];
  onEdit: (tenant: Tenant) => void;
  onArchive: (tenant: Tenant) => void;
  onTenantUpdated: (tenant: Tenant) => void;
  isPending: boolean;
};

function formatShortDate(isoDate: string | null) {
  if (!isoDate) return "—";
  return new Date(isoDate + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "2-digit",
  });
}

function leaseBadgeClass(days: number) {
  if (days < 30) return "bg-red-50 text-red-700";
  if (days < 60) return "bg-amber-50 text-amber-700";
  return "bg-zinc-100 text-zinc-600";
}

function TenantPetControl({
  tenant,
  onUpdated,
  disabled,
}: {
  tenant: Tenant;
  onUpdated: (tenant: Tenant) => void;
  disabled: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [petName, setPetName] = useState(tenant.petName ?? "");
  const [petType, setPetType] = useState(tenant.petType ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startTransition] = useTransition();

  function savePet() {
    const name = petName.trim();
    if (!name) {
      setError("Pet name is required.");
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

      const { data, error: saveError } = await supabase
        .from("tenants")
        .update({
          pet_name: name,
          pet_type: petType.trim() || null,
        })
        .eq("id", tenant.id)
        .eq("user_id", user.id)
        .select(`*, properties(${PROPERTY_ADDRESS_SELECT})`)
        .single();

      if (saveError || !data) {
        setError(
          saveError?.message.includes("pet_name")
            ? "Run migration 20250516030000_tenant_deposit_pets.sql in Supabase."
            : (saveError?.message ?? "Could not save pet."),
        );
        return;
      }

      onUpdated(rowToTenant(data as TenantRow));
      setIsEditing(false);
    });
  }

  function clearPet() {
    startTransition(async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("tenants")
        .update({ pet_name: null, pet_type: null })
        .eq("id", tenant.id)
        .eq("user_id", user.id)
        .select(`*, properties(${PROPERTY_ADDRESS_SELECT})`)
        .single();

      if (data) {
        onUpdated(rowToTenant(data as TenantRow));
      }
      setIsEditing(false);
    });
  }

  if (tenant.petName && !isEditing) {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">
          <Dog className="h-3 w-3" aria-hidden />
          {tenant.petName}
          {tenant.petType ? ` · ${tenant.petType}` : ""}
        </span>
        <button
          type="button"
          disabled={disabled || isSaving}
          onClick={(e) => {
            e.stopPropagation();
            setPetName(tenant.petName ?? "");
            setPetType(tenant.petType ?? "");
            setIsEditing(true);
          }}
          className="text-xs text-zinc-500 hover:text-zinc-800 disabled:opacity-50"
        >
          Edit pet
        </button>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div
        className="flex flex-wrap items-end gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        <label className="min-w-0 flex-1">
          <span className="sr-only">Pet name</span>
          <input
            type="text"
            value={petName}
            onChange={(e) => setPetName(e.target.value)}
            placeholder="Pet name"
            className="w-full rounded border border-zinc-200 px-2 py-1 text-xs"
          />
        </label>
        <label className="w-20">
          <span className="sr-only">Pet type</span>
          <input
            type="text"
            value={petType}
            onChange={(e) => setPetType(e.target.value)}
            placeholder="Dog"
            className="w-full rounded border border-zinc-200 px-2 py-1 text-xs"
          />
        </label>
        <button
          type="button"
          disabled={isSaving}
          onClick={savePet}
          className="rounded bg-zinc-900 px-2 py-1 text-xs font-medium text-white"
        >
          Save
        </button>
        <button
          type="button"
          disabled={isSaving}
          onClick={() => {
            if (tenant.petName) {
              setIsEditing(false);
            } else {
              setPetName("");
              setPetType("");
              setIsEditing(false);
            }
          }}
          className="text-xs text-zinc-500"
        >
          Cancel
        </button>
        {tenant.petName ? (
          <button
            type="button"
            disabled={isSaving}
            onClick={clearPet}
            className="text-xs text-red-600"
          >
            Remove
          </button>
        ) : null}
        {error ? (
          <p className="w-full text-xs text-red-600">{error}</p>
        ) : null}
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled || isSaving}
      onClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
      className="inline-flex items-center gap-1 rounded-md border border-dashed border-zinc-300 px-2 py-0.5 text-xs font-medium text-zinc-600 hover:border-zinc-400 hover:bg-zinc-50 disabled:opacity-50"
    >
      <Dog className="h-3 w-3" aria-hidden />
      Add pet
    </button>
  );
}

function TenantRowCard({
  tenant,
  onEdit,
  onArchive,
  onTenantUpdated,
  isPending,
}: {
  tenant: Tenant;
  onEdit: (tenant: Tenant) => void;
  onArchive: (tenant: Tenant) => void;
  onTenantUpdated: (tenant: Tenant) => void;
  isPending: boolean;
}) {
  const router = useRouter();
  const days = daysUntil(tenant.leaseEnd);

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => router.push(`/tenants/${tenant.id}`)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          router.push(`/tenants/${tenant.id}`);
        }
      }}
      className="cursor-pointer rounded-lg border border-zinc-100 bg-zinc-50/50 px-3 py-2.5 transition-colors hover:border-zinc-200 hover:bg-white"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-zinc-900">{tenant.name}</p>
          <p className="mt-0.5 truncate text-xs text-zinc-500">
            {[tenant.email, tenant.phone].filter(Boolean).join(" · ") || "No contact"}
          </p>
        </div>
        <div className="flex shrink-0 gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            disabled={isPending}
            onClick={() => onEdit(tenant)}
            className="rounded p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-50"
            aria-label={`Edit ${tenant.name}`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => onArchive(tenant)}
            className="rounded p-1.5 text-zinc-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
            aria-label={`Archive ${tenant.name}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-600">
        <span>
          Rent{" "}
          <span className="font-medium text-zinc-900">
            {tenant.monthlyRent ? formatCurrency(tenant.monthlyRent) : "—"}
          </span>
        </span>
        <span>
          Deposit{" "}
          <span className="font-medium text-zinc-900">
            {tenant.securityDeposit != null
              ? formatCurrency(tenant.securityDeposit)
              : "—"}
          </span>
        </span>
        <span>
          Lease ends{" "}
          <span className="font-medium text-zinc-900">
            {formatShortDate(tenant.leaseEnd)}
          </span>
        </span>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 font-medium",
            leaseBadgeClass(days),
          )}
        >
          {days < 0 ? "Expired" : `${days}d left`}
        </span>
      </div>

      <div className="mt-2" onClick={(e) => e.stopPropagation()}>
        <TenantPetControl
          tenant={tenant}
          onUpdated={onTenantUpdated}
          disabled={isPending}
        />
      </div>
    </div>
  );
}

export function TenantsGroupedList({
  groups,
  onEdit,
  onArchive,
  onTenantUpdated,
  isPending,
}: TenantsGroupedListProps) {
  if (groups.length === 0) {
    return null;
  }

  return (
    <div className="divide-y divide-zinc-200">
      {groups.map((property) => (
        <section key={property.propertyId} className="px-4 py-5 sm:px-6">
          <h3 className="text-sm font-semibold text-zinc-900">
            {property.propertyAddress}
          </h3>
          <div className="mt-4 space-y-4">
            {property.units.map((unit) => (
              <div key={`${property.propertyId}-${unit.unitLabel}`}>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  {unit.unitLabel === "— No unit"
                    ? "No unit assigned"
                    : `Apartment ${unit.unitLabel}`}
                </p>
                {unit.tenants.length === 0 ? (
                  <p className="mt-2 text-xs text-zinc-400">No tenants</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {unit.tenants.map((tenant) => (
                      <li key={tenant.id}>
                        <TenantRowCard
                          tenant={tenant}
                          onEdit={onEdit}
                          onArchive={onArchive}
                          onTenantUpdated={onTenantUpdated}
                          isPending={isPending}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
