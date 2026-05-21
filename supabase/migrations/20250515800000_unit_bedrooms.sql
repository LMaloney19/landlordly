-- Bedrooms per apartment (unit), not per building

alter table public.property_units
  add column if not exists bedrooms integer not null default 1
    check (bedrooms >= 0);

-- Drop building-wide bedrooms if it was added earlier
alter table public.properties
  drop column if exists bedrooms;
