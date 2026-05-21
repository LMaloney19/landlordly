"use client";

import {
  Building2,
  ChevronDown,
  Dog,
  DoorOpen,
  Mail,
  Pencil,
  Phone,
  Trash2,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { signedOutSaveMessage } from "@/lib/dev-bypass";
import { PROPERTY_ADDRESS_SELECT } from "@/lib/properties";
import { createClient } from "@/lib/supabase/client";
import {
  daysUntil,
  rowToTenant,
  type TenantPropertyGroup,
  type TenantRow,
  type TenantUnitGroup,
} from "@/lib/tenants";
import { cn, formatCurrency } from "@/lib/utils";
import type { Tenant } from "@/types";

type TenantsGroupedListProps = {
  groups: TenantPropertyGroup[];
  collapseKey?: string;
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
    year: "numeric",
  });
}

function formatUnitTitle(unitLabel: string) {
  if (unitLabel === "— No unit") return "Unassigned unit";
  return `Unit ${unitLabel}`;
}

function leaseBadgeClass(days: number) {
  if (days < 0) return "bg-red-100 text-red-800 ring-red-200";
  if (days < 30) return "bg-red-50 text-red-700 ring-red-100";
  if (days < 60) return "bg-amber-50 text-amber-800 ring-amber-100";
  return "bg-emerald-50 text-emerald-800 ring-emerald-100";
}

function StatCell({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-md bg-zinc-50 px-2.5 py-2 ring-1 ring-zinc-100", className)}>
      <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums text-zinc-900">{value}</p>
    </div>
  );
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
  const [petType, setPetType] = useState(tenant.petType ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startTransition] = useTransition();

  function savePet() {
    const type = petType.trim();
    if (!type) {
      setError("Pet type is required.");
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
          pet_name: null,
          pet_type: type,
        })
        .eq("id", tenant.id)
        .eq("user_id", user.id)
        .select(`*, properties(${PROPERTY_ADDRESS_SELECT})`)
        .single();

      if (saveError || !data) {
        setError(
          saveError?.message.includes("pet_type")
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

  if (tenant.petType && !isEditing) {
    return (
      <div className="flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-3">
        <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 ring-1 ring-emerald-100">
          <Dog className="h-3.5 w-3.5" aria-hidden />
          {tenant.petType}
        </span>
        <button
          type="button"
          disabled={disabled || isSaving}
          onClick={(e) => {
            e.stopPropagation();
            setPetType(tenant.petType ?? "");
            setIsEditing(true);
          }}
          className="text-xs font-medium text-zinc-500 hover:text-zinc-800"
        >
          Edit
        </button>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div
        className="space-y-2 border-t border-zinc-100 pt-3"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-xs font-medium text-zinc-600">Pet on lease</p>
        <div className="flex flex-wrap items-end gap-2">
          <input
            type="text"
            value={petType}
            onChange={(e) => setPetType(e.target.value)}
            placeholder="e.g. Dog, Cat"
            className="min-w-[140px] flex-1 rounded-md border border-zinc-200 px-2.5 py-1.5 text-sm"
          />
          <button
            type="button"
            disabled={isSaving}
            onClick={savePet}
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white"
          >
            Save
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={() => {
              if (tenant.petType) setIsEditing(false);
              else {
                setPetType("");
                setIsEditing(false);
              }
            }}
            className="text-xs text-zinc-500"
          >
            Cancel
          </button>
          {tenant.petType ? (
            <button
              type="button"
              disabled={isSaving}
              onClick={clearPet}
              className="text-xs text-red-600"
            >
              Remove
            </button>
          ) : null}
        </div>
        {error ? <p className="text-xs text-red-600">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="border-t border-zinc-100 pt-3" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        disabled={disabled || isSaving}
        onClick={() => setIsEditing(true)}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-900 disabled:opacity-50"
      >
        <Dog className="h-3.5 w-3.5" aria-hidden />
        Add pet to lease
      </button>
    </div>
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
    <article
      role="link"
      tabIndex={0}
      onClick={() => router.push(`/tenants/${tenant.id}`)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          router.push(`/tenants/${tenant.id}`);
        }
      }}
      className="group cursor-pointer rounded-lg border border-zinc-200 bg-white p-4 shadow-sm transition-all hover:border-zinc-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-600">
            <User className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-zinc-900">{tenant.name}</p>
            <div className="mt-1 flex flex-col gap-0.5 text-xs text-zinc-500">
              {tenant.email ? (
                <span className="inline-flex items-center gap-1 truncate">
                  <Mail className="h-3 w-3 shrink-0" aria-hidden />
                  {tenant.email}
                </span>
              ) : null}
              {tenant.phone ? (
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-3 w-3 shrink-0" aria-hidden />
                  {tenant.phone}
                </span>
              ) : null}
              {!tenant.email && !tenant.phone ? (
                <span className="text-zinc-400">No contact info</span>
              ) : null}
            </div>
          </div>
        </div>
        <div
          className="flex shrink-0 gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            disabled={isPending}
            onClick={() => onEdit(tenant)}
            className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 disabled:opacity-50"
            aria-label={`Edit ${tenant.name}`}
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => onArchive(tenant)}
            className="rounded-md p-1.5 text-zinc-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
            aria-label={`Archive ${tenant.name}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatCell
          label="Monthly rent"
          value={tenant.monthlyRent ? formatCurrency(tenant.monthlyRent) : "—"}
        />
        <StatCell
          label="Deposit"
          value={
            tenant.securityDeposit != null
              ? formatCurrency(tenant.securityDeposit)
              : "—"
          }
        />
        <StatCell label="Lease ends" value={formatShortDate(tenant.leaseEnd)} />
        <div className="flex flex-col justify-center rounded-md bg-zinc-50 px-2.5 py-2 ring-1 ring-zinc-100">
          <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
            Status
          </p>
          <span
            className={cn(
              "mt-1 inline-flex w-fit rounded-full px-2 py-0.5 text-xs font-semibold ring-1",
              leaseBadgeClass(days),
            )}
          >
            {days < 0 ? "Expired" : `${days} days left`}
          </span>
        </div>
      </div>

      <TenantPetControl
        tenant={tenant}
        onUpdated={onTenantUpdated}
        disabled={isPending}
      />
    </article>
  );
}

function UnitSection({
  unit,
  onEdit,
  onArchive,
  onTenantUpdated,
  isPending,
}: {
  unit: TenantUnitGroup;
  onEdit: (tenant: Tenant) => void;
  onArchive: (tenant: Tenant) => void;
  onTenantUpdated: (tenant: Tenant) => void;
  isPending: boolean;
}) {
  const isVacant = unit.tenants.length === 0;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border bg-white",
        isVacant ? "border-dashed border-zinc-200" : "border-zinc-200 shadow-sm",
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between gap-3 border-b px-4 py-3",
          isVacant ? "border-zinc-100 bg-zinc-50/50" : "border-zinc-100 bg-zinc-50",
        )}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
              isVacant ? "bg-zinc-100 text-zinc-400" : "bg-white text-zinc-700 ring-1 ring-zinc-200",
            )}
          >
            <DoorOpen className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
              Apartment / unit
            </p>
            <p className="text-sm font-semibold text-zinc-900">
              {formatUnitTitle(unit.unitLabel)}
            </p>
          </div>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium",
            isVacant
              ? "bg-zinc-100 text-zinc-500"
              : "bg-zinc-900 text-white",
          )}
        >
          {isVacant ? "Vacant" : `${unit.tenants.length} tenant${unit.tenants.length === 1 ? "" : "s"}`}
        </span>
      </div>

      {isVacant ? (
        <p className="px-4 py-6 text-center text-sm text-zinc-400">
          No tenant assigned to this unit
        </p>
      ) : (
        <ul className="space-y-3 p-3">
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
  );
}

function tenantCountForProperty(property: TenantPropertyGroup) {
  return property.units.reduce((sum, unit) => sum + unit.tenants.length, 0);
}

export function TenantsGroupedList({
  groups,
  collapseKey = "",
  onEdit,
  onArchive,
  onTenantUpdated,
  isPending,
}: TenantsGroupedListProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setExpandedIds(new Set());
  }, [collapseKey]);

  function toggleProperty(propertyId: string) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(propertyId)) {
        next.delete(propertyId);
      } else {
        next.add(propertyId);
      }
      return next;
    });
  }

  function expandAll() {
    setExpandedIds(new Set(groups.map((g) => g.propertyId)));
  }

  function collapseAll() {
    setExpandedIds(new Set());
  }

  if (groups.length === 0) {
    return null;
  }

  const allExpanded =
    groups.length > 0 && groups.every((g) => expandedIds.has(g.propertyId));

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-zinc-500">
          Expand a property to view units and tenants
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={expandAll}
            disabled={allExpanded}
            className="rounded-md border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-40"
          >
            Expand all
          </button>
          <button
            type="button"
            onClick={collapseAll}
            disabled={expandedIds.size === 0}
            className="rounded-md border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-40"
          >
            Collapse all
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {groups.map((property) => {
          const isExpanded = expandedIds.has(property.propertyId);
          const tenantCount = tenantCountForProperty(property);
          const occupiedUnits = property.units.filter((u) => u.tenants.length > 0).length;

          return (
            <section
              key={property.propertyId}
              className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm"
            >
              <button
                type="button"
                onClick={() => toggleProperty(property.propertyId)}
                aria-expanded={isExpanded}
                className="flex w-full items-center gap-4 px-4 py-4 text-left transition-colors hover:bg-zinc-50/80 sm:px-5"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-sm">
                  <Building2 className="h-5 w-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                    Property
                  </span>
                  <span className="mt-0.5 block text-base font-semibold leading-snug text-zinc-900">
                    {property.propertyAddress}
                  </span>
                  <span className="mt-2 flex flex-wrap gap-2">
                    <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700">
                      {property.units.length}{" "}
                      {property.units.length === 1 ? "unit" : "units"}
                    </span>
                    <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700">
                      {occupiedUnits} occupied
                    </span>
                    <span className="rounded-full bg-zinc-900 px-2.5 py-0.5 text-xs font-medium text-white">
                      {tenantCount} {tenantCount === 1 ? "tenant" : "tenants"}
                    </span>
                  </span>
                </span>
                <ChevronDown
                  className={cn(
                    "h-5 w-5 shrink-0 text-zinc-400 transition-transform",
                    isExpanded ? "rotate-180" : "rotate-0",
                  )}
                  aria-hidden
                />
              </button>

              {isExpanded ? (
                <div className="space-y-3 border-t border-zinc-100 bg-zinc-50/60 px-4 py-4 sm:px-5">
                  {property.units.map((unit) => (
                    <UnitSection
                      key={`${property.propertyId}-${unit.unitLabel}`}
                      unit={unit}
                      onEdit={onEdit}
                      onArchive={onArchive}
                      onTenantUpdated={onTenantUpdated}
                      isPending={isPending}
                    />
                  ))}
                </div>
              ) : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}
