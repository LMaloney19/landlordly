-- Tenants and leases for Landlordly
create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  name text not null,
  email text,
  phone text,
  unit_label text,
  lease_start date,
  lease_end date not null,
  monthly_rent numeric(12, 2) check (monthly_rent is null or monthly_rent > 0),
  created_at timestamptz not null default now()
);

create index if not exists tenants_user_id_idx on public.tenants (user_id);
create index if not exists tenants_property_id_idx on public.tenants (property_id);
create index if not exists tenants_lease_end_idx on public.tenants (lease_end);

alter table public.tenants enable row level security;

create policy "Users can view own tenants"
  on public.tenants
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own tenants"
  on public.tenants
  for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.properties p
      where p.id = property_id and p.user_id = auth.uid()
    )
  );

create policy "Users can update own tenants"
  on public.tenants
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own tenants"
  on public.tenants
  for delete
  using (auth.uid() = user_id);
