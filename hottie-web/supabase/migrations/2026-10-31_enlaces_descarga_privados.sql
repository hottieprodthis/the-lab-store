-- Los enlaces de descarga de los productos pasan a una tabla que solo ven el
-- admin y el servidor (antes estaban en products, que se lee publicamente).
create table if not exists public.product_files (
  product_id uuid primary key references public.products(id) on delete cascade,
  file_url text not null,
  updated_at timestamptz not null default now()
);
alter table public.product_files enable row level security;
drop policy if exists "Solo admins gestionan enlaces de descarga" on public.product_files;
create policy "Solo admins gestionan enlaces de descarga" on public.product_files
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));
insert into public.product_files (product_id, file_url)
  select id, coalesce(nullif(file_url, ''), nullif(download_url, '')) from public.products
  where coalesce(nullif(file_url, ''), nullif(download_url, '')) is not null
  on conflict (product_id) do nothing;
alter table public.products drop column if exists file_url;
alter table public.products drop column if exists download_url;
