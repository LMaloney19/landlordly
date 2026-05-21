"use client";

import { useEffect, useMemo, useState, useTransition, type FormEvent } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { TenantForm } from "@/components/tenants/tenant-form";
import { hasDevBypass, signedOutSaveMessage } from "@/lib/dev-bypass";
import {
  PROPERTY_ADDRESS_SELECT,
  PROPERTY_WITH_UNITS_SELECT,
  rowToProperty,
  type PropertyRow,
} from "@/lib/properties";
import { createClient } from "@/lib/supabase/client";
import {
  groupTenantsByPropertyAndUnit,
  rowToTenant,
  type TenantRow,
} from "@/lib/tenants";
import { TenantsGroupedList } from "@/components/tenants/tenants-grouped-list";
import type { Property, Tenant } from "@/types";

type TenantsPageProps = {
  properties: Property[];
  initialTenants: Tenant[];
  loadError?: string;
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
  securityDeposit: string;
  petName: string;
  petType: string;
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
    securityDeposit:
      tenant.securityDeposit !== null && tenant.securityDeposit !== undefined
        ? String(tenant.securityDeposit)
        : "",
    petName: tenant.petName ?? "",
    petType: tenant.petType ?? "",
  };
}

const inputClass =
  "mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 disabled:opacity-60";

export function TenantsPageClient({
  properties: initialProperties,
  initialTenants,
  loadError,
}: TenantsPageProps) {
  const [properties, setProperties] = useState<Property[]>(initialProperties);
  const [tenants, setTenants] = useState<Tenant[]>(initialTenants);
  const [clientLoadError, setClientLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [editDraft, setEditDraft] = useState<TenantEditDraft | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;

    async function loadTenantData() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (hasDevBypass()) {
          setClientLoadError(null);
          setProperties([]);
          setTenants([]);
          return;
        }
        setClientLoadError("Sign in to load your properties and tenants.");
        return;
      }

      const [propertiesResult, tenantsResult] = await Promise.all([
        supabase
          .from("properties")
          .select(PROPERTY_WITH_UNITS_SELECT)
          .order("created_at", { ascending: false }),
        supabase
          .from("tenants")
          .select(`*, properties(${PROPERTY_ADDRESS_SELECT})`)
          .order("created_at", { ascending: false }),
      ]);

      if (cancelled) return;

      if (propertiesResult.error || tenantsResult.error) {
        setClientLoadError(
          propertiesResult.error?.message ??
            tenantsResult.error?.message ??
            "Could not load tenant data.",
        );
        return;
      }

      setClientLoadError(null);
      setProperties(
        (propertiesResult.data as PropertyRow[])
          .filter((property) => !property.archived_at)
          .map(rowToProperty),
      );
      setTenants(
        (tenantsResult.data as TenantRow[])
          .filter((tenant) => !tenant.archived_at)
          .map(rowToTenant),
      );
    }

    void loadTenantData();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredTenants = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return tenants;

    return tenants.filter((tenant) => {
      return (
        tenant.name.toLowerCase().includes(query) ||
        tenant.propertyAddress.toLowerCase().includes(query) ||
        (tenant.unitLabel?.toLowerCase().includes(query) ?? false)
      );
    });
  }, [search, tenants]);

  const groupedTenants = useMemo(
    () => groupTenantsByPropertyAndUnit(filteredTenants, properties),
    [filteredTenants, properties],
  );

  function handleTenantUpdated(updated: Tenant) {
    setTenants((current) =>
      current.map((item) => (item.id === updated.id ? updated : item)),
    );
  }

  const selectedProperty = useMemo(
    () => properties.find((property) => property.id === editDraft?.propertyId),
    [editDraft?.propertyId, properties],
  );

  function openAddDrawer() {
    setActionError(null);
    setEditingTenant(null);
    setEditDraft(null);
    setIsDrawerOpen(true);
  }

  function openEditDrawer(tenant: Tenant) {
    setActionError(null);
    setEditingTenant(tenant);
    setEditDraft(draftFromTenant(tenant));
    setIsDrawerOpen(true);
  }

  function closeDrawer() {
    setIsDrawerOpen(false);
    setEditingTenant(null);
    setEditDraft(null);
    setActionError(null);
  }

  function updateEditDraft(patch: Partial<TenantEditDraft>) {
    setEditDraft((current) => (current ? { ...current, ...patch } : current));
  }

  function handleEditPropertyChange(propertyId: string) {
    const property = properties.find((p) => p.id === propertyId);
    const unit = property?.units[0];
    updateEditDraft({
      propertyId,
      unitLabel: unit?.unitLabel ?? "",
      monthlyRent: unit ? String(unit.monthlyRent) : "",
    });
  }

  function handleEditUnitChange(unitLabel: string) {
    const unit = selectedProperty?.units.find((u) => u.unitLabel === unitLabel);
    updateEditDraft({
      unitLabel,
      ...(unit ? { monthlyRent: String(unit.monthlyRent) } : {}),
    });
  }

  function handleArchive(tenant: Tenant) {
    const confirmed = confirm(
      `Archive tenant "${tenant.name}"?\n\nThis hides the tenant from the active list but does not permanently delete their record.`,
    );
    if (!confirmed) return;

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

      const { error } = await supabase
        .from("tenants")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", tenant.id)
        .eq("user_id", user.id);

      if (error) {
        setActionError(
          error.message.includes("archived_at")
            ? "Archive column missing. Run the latest tenants SQL migration in Supabase."
            : error.message,
        );
        return;
      }

      setTenants((current) => current.filter((item) => item.id !== tenant.id));
      if (editingTenant?.id === tenant.id) {
        closeDrawer();
      }
    });
  }

  function handleEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingTenant || !editDraft) return;

    const name = editDraft.name.trim();
    if (!name) {
      setActionError("Tenant name is required.");
      return;
    }
    if (!editDraft.propertyId) {
      setActionError("Property is required.");
      return;
    }
    if (!editDraft.leaseEnd) {
      setActionError("Lease end is required.");
      return;
    }
    if (editDraft.leaseStart && editDraft.leaseEnd < editDraft.leaseStart) {
      setActionError("Lease end must be on or after lease start.");
      return;
    }

    const monthlyRent = editDraft.monthlyRent
      ? Number(editDraft.monthlyRent)
      : null;
    if (
      editDraft.monthlyRent &&
      (!Number.isFinite(monthlyRent) || monthlyRent === null || monthlyRent <= 0)
    ) {
      setActionError("Monthly rent must be greater than 0.");
      return;
    }

    const securityDeposit = editDraft.securityDeposit
      ? Number(editDraft.securityDeposit)
      : null;
    if (
      editDraft.securityDeposit &&
      (!Number.isFinite(securityDeposit) ||
        securityDeposit === null ||
        securityDeposit < 0)
    ) {
      setActionError("Security deposit must be zero or greater.");
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
          property_id: editDraft.propertyId,
          name,
          email: editDraft.email.trim() || null,
          phone: editDraft.phone.trim() || null,
          unit_label: editDraft.unitLabel.trim() || null,
          lease_start: editDraft.leaseStart || null,
          lease_end: editDraft.leaseEnd,
          monthly_rent: monthlyRent,
          security_deposit: securityDeposit,
          pet_name: editDraft.petName.trim() || null,
          pet_type: editDraft.petType.trim() || null,
        })
        .eq("id", editingTenant.id)
        .eq("user_id", user.id)
        .select(`*, properties(${PROPERTY_ADDRESS_SELECT})`)
        .single();

      if (error || !data) {
        setActionError(error?.message ?? "Tenant could not be updated.");
        return;
      }

      const updated = rowToTenant(data as TenantRow);
      setTenants((current) =>
        current.map((tenant) => (tenant.id === updated.id ? updated : tenant)),
      );
      closeDrawer();
    });
  }

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title="Tenants"
          description="Grouped by property and apartment — rent, deposit, and lease dates at a glance."
        />
        <button
          type="button"
          onClick={openAddDrawer}
          className="rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
        >
          Add tenant
        </button>
      </div>

      {loadError || clientLoadError ? (
        <p
          className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
          role="alert"
        >
          {clientLoadError ?? loadError}
        </p>
      ) : null}

      {actionError ? (
        <p
          className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
          role="alert"
        >
          {actionError}
        </p>
      ) : null}

      <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
        <header className="flex flex-col gap-3 border-b border-zinc-200 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">All tenants</h2>
            <p className="mt-0.5 text-sm text-zinc-500">
              {filteredTenants.length} of {tenants.length}{" "}
              {tenants.length === 1 ? "tenant" : "tenants"}
            </p>
          </div>
          <label className="w-full md:max-w-xs">
            <span className="sr-only">Search tenants</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name or property..."
              className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200"
            />
          </label>
        </header>

        {filteredTenants.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-medium text-zinc-900">
              {tenants.length === 0 ? "No tenants yet" : "No tenants found"}
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              {tenants.length === 0
                ? "Add your first tenant to start tracking leases."
                : "Try searching by another tenant name or property."}
            </p>
          </div>
        ) : (
          <TenantsGroupedList
            groups={groupedTenants}
            onEdit={openEditDrawer}
            onArchive={handleArchive}
            onTenantUpdated={handleTenantUpdated}
            isPending={isPending}
          />
        )}
      </section>

      {isDrawerOpen ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close tenant drawer"
            className="absolute inset-0 bg-zinc-900/30"
            onClick={closeDrawer}
          />
          <aside className="absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-xl">
            <header className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-zinc-900">
                  {editingTenant ? "Edit tenant" : "Add tenant"}
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  {editingTenant
                    ? "Update lease, contact, and rent details."
                    : "Enter lease and contact details for the new tenant."}
                </p>
              </div>
              <button
                type="button"
                onClick={closeDrawer}
                className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Close
              </button>
            </header>
            {editingTenant && editDraft ? (
              <form onSubmit={handleEditSubmit}>
                <fieldset className="space-y-4" disabled={isPending}>
                  <label className="block">
                    <span className="text-sm font-medium text-zinc-700">
                      Tenant name
                    </span>
                    <input
                      type="text"
                      value={editDraft.name}
                      onChange={(event) =>
                        updateEditDraft({ name: event.target.value })
                      }
                      className={inputClass}
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-zinc-700">
                      Property
                    </span>
                    <select
                      value={editDraft.propertyId}
                      onChange={(event) =>
                        handleEditPropertyChange(event.target.value)
                      }
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
                        value={editDraft.unitLabel}
                        onChange={(event) =>
                          handleEditUnitChange(event.target.value)
                        }
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
                        value={editDraft.unitLabel}
                        onChange={(event) =>
                          updateEditDraft({ unitLabel: event.target.value })
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
                        value={editDraft.leaseStart}
                        onChange={(event) =>
                          updateEditDraft({ leaseStart: event.target.value })
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
                        value={editDraft.leaseEnd}
                        onChange={(event) =>
                          updateEditDraft({ leaseEnd: event.target.value })
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
                      value={editDraft.email}
                      onChange={(event) =>
                        updateEditDraft({ email: event.target.value })
                      }
                      className={inputClass}
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-zinc-700">
                      Phone
                    </span>
                    <input
                      type="tel"
                      value={editDraft.phone}
                      onChange={(event) =>
                        updateEditDraft({ phone: event.target.value })
                      }
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
                      value={editDraft.monthlyRent}
                      onChange={(event) =>
                        updateEditDraft({ monthlyRent: event.target.value })
                      }
                      className={inputClass}
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
                      value={editDraft.securityDeposit}
                      onChange={(event) =>
                        updateEditDraft({ securityDeposit: event.target.value })
                      }
                      placeholder="e.g. one month rent"
                      className={inputClass}
                    />
                  </label>

                  <div className="rounded-lg border border-zinc-100 bg-zinc-50/80 p-4">
                    <p className="text-sm font-medium text-zinc-700">Pet (optional)</p>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <label className="block">
                        <span className="text-xs text-zinc-500">Name</span>
                        <input
                          type="text"
                          value={editDraft.petName}
                          onChange={(event) =>
                            updateEditDraft({ petName: event.target.value })
                          }
                          placeholder="Max"
                          className={inputClass}
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs text-zinc-500">Type</span>
                        <input
                          type="text"
                          value={editDraft.petType}
                          onChange={(event) =>
                            updateEditDraft({ petType: event.target.value })
                          }
                          placeholder="Dog"
                          className={inputClass}
                        />
                      </label>
                    </div>
                  </div>
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
            ) : (
              <TenantForm
                properties={properties}
                onTenantsAdded={(added) => {
                  setTenants((current) => [...added, ...current]);
                  closeDrawer();
                }}
              />
            )}
          </aside>
        </div>
      ) : null}
    </>
  );
}
