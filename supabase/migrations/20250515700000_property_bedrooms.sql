-- Total bedrooms for the building (reference field on Properties screen)

alter table public.properties
  add column if not exists bedrooms integer not null default 1
    check (bedrooms >= 0);
