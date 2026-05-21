-- Expenses for Landlordly.
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  expense_date date not null default current_date,
  category text not null check (
    category in (
      'Repairs',
      'Insurance',
      'Mortgage Interest',
      'Utilities',
      'Management Fees',
      'Advertising',
      'Legal & Professional',
      'Supplies',
      'Taxes',
      'Other'
    )
  ),
  amount numeric(12, 2) not null check (amount > 0),
  vendor text not null,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists expenses_user_id_idx on public.expenses (user_id);
create index if not exists expenses_property_id_idx on public.expenses (property_id);
create index if not exists expenses_expense_date_idx on public.expenses (expense_date);
create index if not exists expenses_category_idx on public.expenses (category);

alter table public.expenses enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'expenses'
      and policyname = 'Users can view own expenses'
  ) then
    create policy "Users can view own expenses"
      on public.expenses
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'expenses'
      and policyname = 'Users can insert own expenses'
  ) then
    create policy "Users can insert own expenses"
      on public.expenses
      for insert
      with check (
        auth.uid() = user_id
        and exists (
          select 1 from public.properties p
          where p.id = property_id and p.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'expenses'
      and policyname = 'Users can update own expenses'
  ) then
    create policy "Users can update own expenses"
      on public.expenses
      for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'expenses'
      and policyname = 'Users can delete own expenses'
  ) then
    create policy "Users can delete own expenses"
      on public.expenses
      for delete
      using (auth.uid() = user_id);
  end if;
end $$;
