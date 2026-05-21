-- Rent payments for Landlordly
create table if not exists public.rent_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  paid_at date not null default current_date,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists rent_payments_user_id_idx on public.rent_payments (user_id);
create index if not exists rent_payments_paid_at_idx on public.rent_payments (paid_at);
create index if not exists rent_payments_property_id_idx on public.rent_payments (property_id);

alter table public.rent_payments enable row level security;

create policy "Users can view own rent payments"
  on public.rent_payments
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own rent payments"
  on public.rent_payments
  for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.properties p
      where p.id = property_id and p.user_id = auth.uid()
    )
  );

create policy "Users can update own rent payments"
  on public.rent_payments
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own rent payments"
  on public.rent_payments
  for delete
  using (auth.uid() = user_id);
