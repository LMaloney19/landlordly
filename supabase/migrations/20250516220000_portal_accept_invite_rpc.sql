-- Complete portal invite acceptance in one security-definer step (avoids RLS gaps on invite UPDATE).

create or replace function public.accept_tenant_portal_invite_by_token(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_invite_id uuid;
  v_tenant_id uuid;
  v_landlord_id uuid;
  v_tenant_name text;
  v_tenant_email text;
  v_portal_auth uuid;
  v_expires_at timestamptz;
  v_accepted_at timestamptz;
  v_other_name text;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'code', 'not_authenticated');
  end if;

  select
    i.id,
    i.tenant_id,
    t.user_id,
    t.name,
    t.email,
    t.portal_auth_user_id,
    i.expires_at,
    i.accepted_at
  into
    v_invite_id,
    v_tenant_id,
    v_landlord_id,
    v_tenant_name,
    v_tenant_email,
    v_portal_auth,
    v_expires_at,
    v_accepted_at
  from public.tenant_portal_invites i
  inner join public.tenants t on t.id = i.tenant_id
  where i.token = p_token
  limit 1;

  if v_invite_id is null then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;

  if v_accepted_at is not null then
    if v_portal_auth = v_uid then
      return jsonb_build_object('ok', true, 'tenant_id', v_tenant_id);
    end if;
    return jsonb_build_object('ok', false, 'code', 'already_accepted');
  end if;

  if v_expires_at is not null and v_expires_at < now() then
    return jsonb_build_object('ok', false, 'code', 'expired');
  end if;

  if v_uid = v_landlord_id then
    return jsonb_build_object(
      'ok',
      false,
      'code',
      'landlord_account',
      'tenant_name',
      v_tenant_name
    );
  end if;

  if v_portal_auth is not null and v_portal_auth <> v_uid then
    return jsonb_build_object('ok', false, 'code', 'tenant_other_account');
  end if;

  select t.name
  into v_other_name
  from public.tenants t
  where t.portal_auth_user_id = v_uid
    and t.id <> v_tenant_id
  limit 1;

  if v_other_name is not null then
    return jsonb_build_object(
      'ok',
      false,
      'code',
      'user_linked_other',
      'other_name',
      v_other_name,
      'tenant_name',
      v_tenant_name,
      'tenant_email',
      v_tenant_email
    );
  end if;

  if v_tenant_email is not null
    and trim(v_tenant_email) <> ''
    and exists (
      select 1
      from public.tenants t2
      where t2.user_id = v_landlord_id
        and t2.id <> v_tenant_id
        and t2.archived_at is null
        and lower(trim(t2.email)) = lower(trim(v_tenant_email))
    ) then
    return jsonb_build_object('ok', false, 'code', 'email_conflict');
  end if;

  if v_tenant_email is not null
    and trim(v_tenant_email) <> ''
    and lower(trim(v_tenant_email)) <>
      lower(trim(coalesce((select email from auth.users where id = v_uid), ''))) then
    return jsonb_build_object(
      'ok',
      false,
      'code',
      'email_mismatch',
      'tenant_email',
      v_tenant_email
    );
  end if;

  update public.tenants
  set
    portal_auth_user_id = v_uid,
    portal_linked_at = now()
  where id = v_tenant_id;

  update public.tenant_portal_invites
  set accepted_at = now()
  where id = v_invite_id;

  return jsonb_build_object(
    'ok',
    true,
    'tenant_id',
    v_tenant_id
  );
end;
$$;

revoke all on function public.accept_tenant_portal_invite_by_token(text) from public;
grant execute on function public.accept_tenant_portal_invite_by_token(text) to authenticated;
