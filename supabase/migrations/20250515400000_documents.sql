-- Document metadata for Landlordly
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  property_id uuid references public.properties (id) on delete set null,
  name text not null,
  file_path text not null,
  category text not null default 'other'
    check (category in ('lease', 'receipt', 'inspection', 'other')),
  mime_type text,
  size_bytes bigint,
  created_at timestamptz not null default now()
);

create index if not exists documents_user_id_idx on public.documents (user_id);
create index if not exists documents_property_id_idx on public.documents (property_id);

alter table public.documents enable row level security;

create policy "Users can view own documents"
  on public.documents for select using (auth.uid() = user_id);

create policy "Users can insert own documents"
  on public.documents for insert with check (auth.uid() = user_id);

create policy "Users can update own documents"
  on public.documents for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can delete own documents"
  on public.documents for delete using (auth.uid() = user_id);

-- Storage bucket (private)
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

create policy "Users can upload own document files"
  on storage.objects for insert
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can read own document files"
  on storage.objects for select
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete own document files"
  on storage.objects for delete
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
