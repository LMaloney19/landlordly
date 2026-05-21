-- Unit-level expenses and receipt attachments for Landlordly.

alter table public.expenses
  add column if not exists unit_label text,
  add column if not exists receipt_path text,
  add column if not exists receipt_mime_type text,
  add column if not exists receipt_file_name text;

create index if not exists expenses_unit_label_idx on public.expenses (property_id, unit_label);

-- Private bucket for expense receipts / invoices
insert into storage.buckets (id, name, public)
values ('expense-receipts', 'expense-receipts', false)
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users can upload own expense receipt files'
  ) then
    create policy "Users can upload own expense receipt files"
      on storage.objects for insert
      with check (
        bucket_id = 'expense-receipts'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users can read own expense receipt files'
  ) then
    create policy "Users can read own expense receipt files"
      on storage.objects for select
      using (
        bucket_id = 'expense-receipts'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users can delete own expense receipt files'
  ) then
    create policy "Users can delete own expense receipt files"
      on storage.objects for delete
      using (
        bucket_id = 'expense-receipts'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;
end $$;
