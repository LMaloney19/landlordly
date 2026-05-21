-- Individual units within a property (apartment block)
create table if not exists public.property_units (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  unit_label text not null,
  monthly_rent numeric(12, 2) not null check (monthly_rent > 0),
  created_at timestamptz not null default now(),
  unique (property_id, unit_label)
);

create index if not exists property_units_property_id_idx
  on public.property_units (property_id);

create index if not exists property_units_user_id_idx
  on public.property_units (user_id);

alter table public.property_units enable row level security;

create policy "Users can view own property units"
  on public.property_units for select using (auth.uid() = user_id);

create policy "Users can insert own property units"
  on public.property_units for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.properties p
      where p.id = property_id and p.user_id = auth.uid()
    )
  );

create policy "Users can update own property units"
  on public.property_units for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can delete own property units"
  on public.property_units for delete using (auth.uid() = user_id);

-- Migrate existing properties into unit rows
insert into public.property_units (user_id, property_id, unit_label, monthly_rent)
select
  p.user_id,
  p.id,
  'Unit ' || gs.n,
  p.monthly_rent
from public.properties p
cross join lateral generate_series(1, greatest(coalesce(p.units, 1), 1)) as gs(n)
where not exists (
  select 1 from public.property_units u where u.property_id = p.id
)
and p.monthly_rent is not null;

alter table public.properties drop column if exists units;
alter table public.properties drop column if exists monthly_rent;
