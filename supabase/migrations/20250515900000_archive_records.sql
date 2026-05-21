-- Non-destructive archive flags.
-- Records are hidden from the UI instead of being permanently deleted.

alter table public.tenants
  add column if not exists archived_at timestamptz;

create index if not exists tenants_archived_at_idx
  on public.tenants (archived_at);

alter table public.properties
  add column if not exists archived_at timestamptz;

create index if not exists properties_archived_at_idx
  on public.properties (archived_at);

alter table public.documents
  add column if not exists archived_at timestamptz;

create index if not exists documents_archived_at_idx
  on public.documents (archived_at);
