-- Security deposit and pet info on tenants
alter table public.tenants
  add column if not exists security_deposit numeric(12, 2)
    check (security_deposit is null or security_deposit >= 0),
  add column if not exists pet_name text,
  add column if not exists pet_type text;
