-- Optional links used by tenant profile pages.
-- Existing property-level records still work; these columns allow future records
-- to be tied directly to a tenant or unit.

alter table public.rent_payments
  add column if not exists tenant_id uuid references public.tenants (id) on delete set null,
  add column if not exists unit_label text;

create index if not exists rent_payments_tenant_id_idx
  on public.rent_payments (tenant_id);

create index if not exists rent_payments_property_unit_idx
  on public.rent_payments (property_id, unit_label);

alter table public.maintenance_requests
  add column if not exists tenant_id uuid references public.tenants (id) on delete set null,
  add column if not exists unit_label text;

create index if not exists maintenance_requests_tenant_id_idx
  on public.maintenance_requests (tenant_id);

create index if not exists maintenance_requests_property_unit_idx
  on public.maintenance_requests (property_id, unit_label);
