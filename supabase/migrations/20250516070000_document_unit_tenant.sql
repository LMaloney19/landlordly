-- Link documents to unit and tenant (optional, like expenses)
alter table public.documents
  add column if not exists unit_label text,
  add column if not exists tenant_id uuid references public.tenants (id) on delete set null;

create index if not exists documents_tenant_id_idx on public.documents (tenant_id);
