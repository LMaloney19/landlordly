-- Maintenance requests for Landlordly
create table if not exists public.maintenance_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists maintenance_requests_user_id_idx
  on public.maintenance_requests (user_id);

create index if not exists maintenance_requests_property_id_idx
  on public.maintenance_requests (property_id);

create index if not exists maintenance_requests_status_idx
  on public.maintenance_requests (status);

alter table public.maintenance_requests enable row level security;

create policy "Users can view own maintenance requests"
  on public.maintenance_requests
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own maintenance requests"
  on public.maintenance_requests
  for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.properties p
      where p.id = property_id and p.user_id = auth.uid()
    )
  );

create policy "Users can update own maintenance requests"
  on public.maintenance_requests
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own maintenance requests"
  on public.maintenance_requests
  for delete
  using (auth.uid() = user_id);
