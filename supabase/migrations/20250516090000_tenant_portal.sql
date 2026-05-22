-- Tenant portal: link tenant records to auth users and allow tenant-submitted updates

alter table public.tenants
  add column if not exists portal_auth_user_id uuid references auth.users (id) on delete set null,
  add column if not exists portal_linked_at timestamptz;

create unique index if not exists tenants_portal_auth_user_id_uniq
  on public.tenants (portal_auth_user_id)
  where portal_auth_user_id is not null;

alter table public.rent_payments
  add column if not exists source text not null default 'landlord'
    check (source in ('landlord', 'tenant_portal', 'stripe'));

create table if not exists public.tenant_portal_invites (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  landlord_user_id uuid not null references auth.users (id) on delete cascade,
  token text not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists tenant_portal_invites_tenant_id_idx
  on public.tenant_portal_invites (tenant_id);

create index if not exists tenant_portal_invites_token_idx
  on public.tenant_portal_invites (token);

alter table public.tenant_portal_invites enable row level security;

create policy "Landlords manage own tenant portal invites"
  on public.tenant_portal_invites
  for all
  using (auth.uid() = landlord_user_id)
  with check (auth.uid() = landlord_user_id);

-- Tenants can read their own lease row when linked
create policy "Portal tenant can view own tenant row"
  on public.tenants
  for select
  using (portal_auth_user_id = auth.uid());

-- Tenants can insert maintenance tied to their lease
create policy "Portal tenant can create maintenance requests"
  on public.maintenance_requests
  for insert
  with check (
    exists (
      select 1 from public.tenants t
      where t.id = tenant_id
        and t.portal_auth_user_id = auth.uid()
        and t.property_id = property_id
        and t.user_id = user_id
    )
  );

-- Tenants can view maintenance they submitted
create policy "Portal tenant can view own maintenance"
  on public.maintenance_requests
  for select
  using (
    exists (
      select 1 from public.tenants t
      where t.id = tenant_id
        and t.portal_auth_user_id = auth.uid()
    )
  );

-- Tenants can record rent payments on their lease (landlord user_id on row)
create policy "Portal tenant can insert rent payments"
  on public.rent_payments
  for insert
  with check (
    source in ('tenant_portal', 'stripe')
    and exists (
      select 1 from public.tenants t
      where t.id = tenant_id
        and t.portal_auth_user_id = auth.uid()
        and t.property_id = property_id
        and t.user_id = user_id
    )
  );

create policy "Portal tenant can view own rent payments"
  on public.rent_payments
  for select
  using (
    exists (
      select 1 from public.tenants t
      where t.id = tenant_id
        and t.portal_auth_user_id = auth.uid()
    )
  );

-- Invite acceptance (tenant auth reads pending invite by token)
create policy "Authenticated users can read pending portal invites"
  on public.tenant_portal_invites
  for select
  using (
    auth.uid() is not null
    and accepted_at is null
    and expires_at > now()
  );

create policy "Portal user can link tenant with valid invite"
  on public.tenants
  for update
  using (
    portal_auth_user_id is null
    and exists (
      select 1 from public.tenant_portal_invites i
      where i.tenant_id = tenants.id
        and i.accepted_at is null
        and i.expires_at > now()
    )
  )
  with check (portal_auth_user_id = auth.uid());

create policy "Portal user can mark invite accepted"
  on public.tenant_portal_invites
  for update
  using (
    accepted_at is null
    and expires_at > now()
    and exists (
      select 1 from public.tenants t
      where t.id = tenant_id
        and t.portal_auth_user_id = auth.uid()
    )
  )
  with check (accepted_at is not null);

-- Property address for joined maintenance/rent rows in portal
create policy "Portal tenant can view leased property"
  on public.properties
  for select
  using (
    exists (
      select 1 from public.tenants t
      where t.property_id = properties.id
        and t.portal_auth_user_id = auth.uid()
    )
  );
