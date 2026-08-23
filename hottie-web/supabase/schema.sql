-- ============================================================
-- Esquema de la base de datos para la web de Hottie
-- Cómo usarlo: Supabase > tu proyecto > SQL Editor > pega esto > Run
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- PRODUCTOS (venta digital: kits, packs...) ----------
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text default '',
  price_cents integer not null default 0, -- precio en céntimos, ej: 2000 = 20,00€
  currency text not null default 'eur',
  image_url text,
  file_url text,          -- enlace de descarga que se envía tras la compra (opcional)
  active boolean not null default true,   -- si está desmarcado, no se muestra en la tienda
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- SERVICIOS (mezcla, masterización, clases...) ----------
create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text default '',
  price_cents integer,                    -- puede ser null = "desde consulta"
  currency text not null default 'eur',
  image_url text,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- Bucket de almacenamiento para imágenes ----------
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

-- ============================================================
-- Seguridad (Row Level Security)
-- Cualquiera puede LEER los productos/servicios activos.
-- Solo un usuario que ha iniciado sesión (tú, el admin) puede
-- crear / editar / borrar.
-- ============================================================

alter table products enable row level security;
alter table services enable row level security;

create policy "Cualquiera puede ver productos activos"
  on products for select
  using (active = true);

create policy "Admin puede ver todos los productos"
  on products for select
  to authenticated
  using (true);

create policy "Admin puede modificar productos"
  on products for all
  to authenticated
  using (true)
  with check (true);

create policy "Cualquiera puede ver servicios activos"
  on services for select
  using (active = true);

create policy "Admin puede ver todos los servicios"
  on services for select
  to authenticated
  using (true);

create policy "Admin puede modificar servicios"
  on services for all
  to authenticated
  using (true)
  with check (true);

-- Políticas de almacenamiento: lectura pública, escritura solo admin
create policy "Lectura pública de imágenes"
  on storage.objects for select
  using (bucket_id = 'media');

create policy "Admin puede subir imágenes"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'media');

create policy "Admin puede borrar imágenes"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'media');
