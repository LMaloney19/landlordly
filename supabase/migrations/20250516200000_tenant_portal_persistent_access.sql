-- One pending portal access link per tenant; stable until accepted

create unique index if not exists tenant_portal_invites_one_pending_per_tenant
  on public.tenant_portal_invites (tenant_id)
  where accepted_at is null;
