"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition, type FormEvent } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { hasDevBypass, signedOutSaveMessage } from "@/lib/dev-bypass";
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  rowToMaintenance,
  type MaintenanceRow,
} from "@/lib/maintenance";
import {
  PROPERTY_ADDRESS_SELECT,
  PROPERTY_WITH_UNITS_SELECT,
  rowToProperty,
  type PropertyRow,
} from "@/lib/properties";
import { rowToRentPayment, type RentPaymentRow } from "@/lib/rent-payments";
import { createClient } from "@/lib/supabase/client";
import { rowToTenant, type TenantRow } from "@/lib/tenants";
import { cn, formatCurrency } from "@/lib/utils";
import type {
  MaintenanceRequest,
  MaintenanceStatus,
  Property,
  RentPayment,
  Tenant,
} from "@/types";

type TenantProfileClientProps = {
  tenantId: string;
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

type LinkedRentPaymentRow = RentPaymentRow & {
  tenant_id?: string | null;
  unit_label?: string | null;
};

type LinkedMaintenanceRow = MaintenanceRow & {
  tenant_id?: string | null;
  unit_label?: string | null;
};

const inputClass =
  "mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 disabled:opacity-60";

const statusStyles: Record<MaintenanceStatus, string> = {
  open: "bg-amber-50 text-amber-700",
  in_progress: "bg-blue-50 text-blue-700",
  resolved: "bg-emerald-50 text-emerald-700",
};

const priorityStyles = {
  low: "text-zinc-500",
  medium: "text-zinc-700",
  high: "text-red-600",
};

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

function formatDate(isoDate: string | null) {
  if (!isoDate) return "Not set";
  return new Date(isoDate + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(isoDate: string) {
  return new Date(isoDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function sixMonthsAgoIso() {
  const date = new Date();
  date.setMonth(date.getMonth() - 6);
  return date.toISOString().slice(0, 10);
}

function isLinkedToTenantUnit(
  row: { tenant_id?: string | null; unit_label?: string | null },
  tenant: Tenant,
) {
  if (row.tenant_id) return row.tenant_id === tenant.id;
  if (row.unit_label && tenant.unitLabel) return row.unit_label === tenant.unitLabel;
  return true;
}

export function TenantProfileClient({ tenantId }: TenantProfileClientProps) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [payments, setPayments] = useState<RentPayment[]>([]);
  const [maintenanceRequests, setMaintenanceRequests] = useState<
    MaintenanceRequest[]
  >([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<TenantEditDraft | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (hasDevBypass()) {
          setLoadError("Sign in with Supabase to load tenant profile data.");
          return;
        }
        setLoadError("Sign in to load this tenant profile.");
        return;
      }

      const { data: tenantData, error: tenantError } = await supabase
        .from("tenants")
        .select(`*, properties(${PROPERTY_ADDRESS_SELECT})`)
        .eq("id", tenantId)
        .eq("user_id", user.id)
        .is("archived_at", null)
        .single();

      if (cancelled) return;

      if (tenantError || !tenantData) {
        setLoadError(tenantError?.message ?? "Tenant not found.");
        return;
      }

      const loadedTenant = rowToTenant(tenantData as TenantRow);
      setTenant(loadedTenant);
      setDraft(draftFromTenant(loadedTenant));

      const [propertiesResult, paymentsResult, maintenanceResult] =
        await Promise.all([
          supabase
            .from("properties")
            .select(PROPERTY_WITH_UNITS_SELECT)
            .order("created_at", { ascending: false }),
          supabase
            .from("rent_payments")
            .select(`*, properties(${PROPERTY_ADDRESS_SELECT})`)
            .eq("property_id", loadedTenant.propertyId)
            .gte("paid_at", sixMonthsAgoIso())
            .order("paid_at", { ascending: false })
            .limit(20),
          supabase
            .from("maintenance_requests")
            .select(`*, properties(${PROPERTY_ADDRESS_SELECT})`)
            .eq("property_id", loadedTenant.propertyId)
            .in("status", ["open", "in_progress"])
            .order("created_at", { ascending: false })
            .limit(20),
        ]);

      if (cancelled) return;

      if (propertiesResult.data) {
        setProperties(
          (propertiesResult.data as PropertyRow[])
            .filter((property) => !property.archived_at)
            .map(rowToProperty),
        );
      }

      if (paymentsResult.error && !paymentsResult.error.message.includes("rent_payments")) {
        setLoadError(paymentsResult.error.message);
        return;
      }

      if (
        maintenanceResult.error &&
        !maintenanceResult.error.message.includes("maintenance_requests")
      ) {
        setLoadError(maintenanceResult.error.message);
        return;
      }

      setPayments(
        paymentsResult.data
          ? (paymentsResult.data as LinkedRentPaymentRow[])
              .filter((row) => isLinkedToTenantUnit(row, loadedTenant))
              .slice(0, 6)
              .map(rowToRentPayment)
          : [],
      );
      setMaintenanceRequests(
        maintenanceResult.data
          ? (maintenanceResult.data as LinkedMaintenanceRow[])
              .filter((row) => isLinkedToTenantUnit(row, loadedTenant))
              .map(rowToMaintenance)
          : [],
      );
      setLoadError(null);
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  const selectedProperty = useMemo(
    () => properties.find((property) => property.id === draft?.propertyId),
    [draft?.propertyId, properties],
  );

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

  function handleEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tenant || !draft) return;

    const name = draft.name.trim();
    if (!name) {
      setActionError("Tenant name is required.");
      return;
    }
    if (!draft.propertyId) {
      setActionError("Property is required.");
      return;
    }
    if (!draft.leaseEnd) {
      setActionError("Lease end is required.");
      return;
    }
    if (draft.leaseStart && draft.leaseEnd < draft.leaseStart) {
      setActionError("Lease end must be on or after lease start.");
      return;
    }

    const monthlyRent = draft.monthlyRent ? Number(draft.monthlyRent) : null;
    if (
      draft.monthlyRent &&
      (!Number.isFinite(monthlyRent) || monthlyRent === null || monthlyRent <= 0)
    ) {
      setActionError("Monthly rent must be greater than 0.");
      return;
    }

    setActionError(null);
    startTransition(async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setActionError(signedOutSaveMessage());
        return;
      }

      const { data, error } = await supabase
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
        .eq("id", tenant.id)
        .eq("user_id", user.id)
        .select(`*, properties(${PROPERTY_ADDRESS_SELECT})`)
        .single();

      if (error || !data) {
        setActionError(error?.message ?? "Tenant could not be updated.");
        return;
      }

      const updated = rowToTenant(data as TenantRow);
      setTenant(updated);
      setDraft(draftFromTenant(updated));
      setIsEditing(false);
    });
  }

  if (!tenant) {
    return (
      <>
        <PageHeader
          title="Tenant profile"
          description="Full tenant, lease, rent, and maintenance details."
        />
        <p
          className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
          role="alert"
        >
          {loadError ?? "Loading tenant profile..."}
        </p>
      </>
    );
  }

  return (
    <>
      <div className="mb-6">
        <Link
          href="/tenants"
          className="text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900"
        >
          Back to tenants
        </Link>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title={tenant.name}
          description={`${tenant.propertyAddress}${tenant.unitLabel ? ` · Unit ${tenant.unitLabel}` : ""}`}
        />
        <button
          type="button"
          onClick={() => {
            setDraft(draftFromTenant(tenant));
            setActionError(null);
            setIsEditing(true);
          }}
          className="rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
        >
          Edit
        </button>
      </div>

      {loadError ? (
        <p
          className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
          role="alert"
        >
          {loadError}
        </p>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-3">
        <article className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="text-sm font-semibold text-zinc-900">Full details</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Name
              </dt>
              <dd className="mt-1 text-sm text-zinc-900">{tenant.name}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Email
              </dt>
              <dd className="mt-1 text-sm text-zinc-900">
                {tenant.email || "Not set"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Phone
              </dt>
              <dd className="mt-1 text-sm text-zinc-900">
                {tenant.phone || "Not set"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Property
              </dt>
              <dd className="mt-1 text-sm text-zinc-900">
                {tenant.propertyAddress}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Unit number
              </dt>
              <dd className="mt-1 text-sm text-zinc-900">
                {tenant.unitLabel || "Not set"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Monthly rent
              </dt>
              <dd className="mt-1 text-sm text-zinc-900">
                {tenant.monthlyRent ? formatCurrency(tenant.monthlyRent) : "Not set"}
              </dd>
            </div>
          </dl>
        </article>

        <article className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-zinc-900">Lease info</h2>
          <dl className="mt-4 space-y-4">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Lease start
              </dt>
              <dd className="mt-1 text-sm text-zinc-900">
                {formatDate(tenant.leaseStart)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Lease end
              </dt>
              <dd className="mt-1 text-sm text-zinc-900">
                {formatDate(tenant.leaseEnd)}
              </dd>
            </div>
          </dl>
        </article>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <article className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <header>
            <h2 className="text-sm font-semibold text-zinc-900">
              Payment history
            </h2>
            <p className="mt-1 text-sm text-zinc-500">Last 6 months</p>
          </header>
          {payments.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500">
              No rent payments found for this tenant/property in the last 6 months.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-zinc-100">
              {payments.map((payment) => (
                <li
                  key={payment.id}
                  className="flex items-start justify-between gap-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium text-zinc-900">
                      {formatCurrency(payment.amount)}
                    </p>
                    <p className="mt-0.5 text-zinc-500">
                      {formatDate(payment.paidAt)}
                    </p>
                    {payment.notes ? (
                      <p className="mt-1 text-zinc-600">{payment.notes}</p>
                    ) : null}
                  </div>
                  <span className="text-xs text-zinc-500">Paid</span>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <header>
            <h2 className="text-sm font-semibold text-zinc-900">
              Open maintenance
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Requests linked to this unit or property
            </p>
          </header>
          {maintenanceRequests.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500">
              No open maintenance requests found for this tenant unit.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-zinc-100">
              {maintenanceRequests.map((request) => (
                <li key={request.id} className="py-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-zinc-900">{request.title}</p>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        statusStyles[request.status],
                      )}
                    >
                      {STATUS_LABELS[request.status]}
                    </span>
                    <span
                      className={cn(
                        "text-xs font-medium",
                        priorityStyles[request.priority],
                      )}
                    >
                      {PRIORITY_LABELS[request.priority]} priority
                    </span>
                  </div>
                  <p className="mt-1 text-zinc-500">
                    Created {formatDateTime(request.createdAt)}
                  </p>
                  {request.description ? (
                    <p className="mt-2 text-zinc-600">{request.description}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>

      {isEditing && draft ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close edit tenant drawer"
            className="absolute inset-0 bg-zinc-900/30"
            onClick={() => {
              setIsEditing(false);
              setActionError(null);
            }}
          />
          <aside className="absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-xl">
            <header className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-zinc-900">
                  Edit tenant
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Update lease, contact, and rent details.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setActionError(null);
                }}
                className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Close
              </button>
            </header>

            <form onSubmit={handleEditSubmit}>
              <fieldset className="space-y-4" disabled={isPending}>
                <label className="block">
                  <span className="text-sm font-medium text-zinc-700">
                    Tenant name
                  </span>
                  <input
                    type="text"
                    value={draft.name}
                    onChange={(event) => updateDraft({ name: event.target.value })}
                    className={inputClass}
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-zinc-700">
                    Property
                  </span>
                  <select
                    value={draft.propertyId}
                    onChange={(event) => handlePropertyChange(event.target.value)}
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
                    Unit number
                  </span>
                  {selectedProperty && selectedProperty.units.length > 0 ? (
                    <select
                      value={draft.unitLabel}
                      onChange={(event) => handleUnitChange(event.target.value)}
                      className={inputClass}
                    >
                      <option value="">Select unit</option>
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
                      onChange={(event) =>
                        updateDraft({ unitLabel: event.target.value })
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
                      onChange={(event) =>
                        updateDraft({ leaseStart: event.target.value })
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
                      onChange={(event) =>
                        updateDraft({ leaseEnd: event.target.value })
                      }
                      className={inputClass}
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="text-sm font-medium text-zinc-700">Email</span>
                  <input
                    type="email"
                    value={draft.email}
                    onChange={(event) => updateDraft({ email: event.target.value })}
                    className={inputClass}
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-zinc-700">Phone</span>
                  <input
                    type="tel"
                    value={draft.phone}
                    onChange={(event) => updateDraft({ phone: event.target.value })}
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
                    onChange={(event) =>
                      updateDraft({ monthlyRent: event.target.value })
                    }
                    className={inputClass}
                  />
                </label>
              </fieldset>

              {actionError ? (
                <p className="mt-4 text-sm text-red-600" role="alert">
                  {actionError}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={isPending}
                className="mt-6 w-full rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-60"
              >
                {isPending ? "Saving..." : "Save changes"}
              </button>
            </form>
          </aside>
        </div>
      ) : null}
    </>
  );
}
