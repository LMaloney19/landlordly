-- Custom label when document category is "other"
alter table public.documents
  add column if not exists category_other text;
