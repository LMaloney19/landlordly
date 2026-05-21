-- Properties table for Landlordly
create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  address text not null,
  units integer not null check (units >= 1),
  monthly_rent numeric(12, 2) not null check (monthly_rent > 0),
  created_at timestamptz not null default now()
);

create index if not exists properties_user_id_idx on public.properties (user_id);

alter table public.properties enable row level security;

create policy "Users can view own properties"
  on public.properties
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own properties"
  on public.properties
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own properties"
  on public.properties
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own properties"
  on public.properties
  for delete
  using (auth.uid() = user_id);
