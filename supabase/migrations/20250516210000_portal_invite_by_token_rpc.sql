-- Allow portal accept page to resolve invite by secret token before/without tenant session.
-- Token is unguessable; only returns pending, non-expired invites.

create or replace function public.get_tenant_portal_invite_by_token(p_token text)
returns table (
  invite_id uuid,
  tenant_id uuid,
  tenant_name text,
  tenant_email text,
  landlord_user_id uuid,
  expires_at timestamptz,
  accepted_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    i.id as invite_id,
    i.tenant_id,
    t.name as tenant_name,
    t.email as tenant_email,
    i.landlord_user_id,
    i.expires_at,
    i.accepted_at
  from public.tenant_portal_invites i
  inner join public.tenants t on t.id = i.tenant_id
  where i.token = p_token
    and i.accepted_at is null
    and (i.expires_at is null or i.expires_at > now());
$$;

revoke all on function public.get_tenant_portal_invite_by_token(text) from public;
grant execute on function public.get_tenant_portal_invite_by_token(text) to anon, authenticated;
