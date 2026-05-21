-- Structured property addresses (delivery-style)

alter table public.properties
  add column if not exists address_line1 text,
  add column if not exists address_line2 text,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists postal_code text,
  add column if not exists country text default 'US';

-- Copy old single-line address into street line 1
update public.properties
set
  address_line1 = coalesce(address_line1, address),
  country = coalesce(country, 'US')
where address is not null;

-- Placeholders for rows that only had the old single-line address
update public.properties
set
  city = coalesce(nullif(trim(city), ''), 'Update city'),
  state = coalesce(nullif(trim(state), ''), '—'),
  postal_code = coalesce(nullif(trim(postal_code), ''), '00000')
where city is null or state is null or postal_code is null;

alter table public.properties drop column if exists address;

alter table public.properties
  alter column address_line1 set not null,
  alter column city set not null,
  alter column state set not null,
  alter column postal_code set not null,
  alter column country set not null;
