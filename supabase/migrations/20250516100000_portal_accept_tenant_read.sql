-- Allow invite accept flow to read tenant email before portal link exists
create policy "Authenticated users can read tenant for pending portal invite"
  on public.tenants
  for select
  using (
    portal_auth_user_id is null
    and exists (
      select 1 from public.tenant_portal_invites i
      where i.tenant_id = tenants.id
        and i.accepted_at is null
        and i.expires_at > now()
    )
  );
