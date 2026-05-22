-- Rent due day per tenant for overdue / reminder tracking.

alter table public.tenants
  add column if not exists rent_due_day smallint not null default 1;

alter table public.tenants
  drop constraint if exists tenants_rent_due_day_check;

alter table public.tenants
  add constraint tenants_rent_due_day_check
  check (rent_due_day >= 1 and rent_due_day <= 28);
