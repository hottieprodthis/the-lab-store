-- Extras del área de clientes:
--   - Suscripción de por vida (profiles.por_vida). El acceso sigue saliendo de
--     subscribed_until (tiene_suscripcion_activa), que para estos clientes es
--     una fecha que no llega nunca.
--   - Votaciones que propone el admin (votaciones / votos).
--   - Revisiones de temas (revisiones): 1 al mes por suscriptor y un cupo
--     total al mes para todos. Se piden con pedir_revision(), que bloquea el
--     mes mientras cuenta para que nunca pasen del cupo.
-- Todo se lee y escribe desde el servidor (/api) con la service role: sin
-- políticas para anon/authenticated.

alter table public.profiles add column if not exists por_vida boolean not null default false;
alter table public.profiles add column if not exists por_vida_desde timestamptz;

create table if not exists public.votaciones (
  id uuid primary key default gen_random_uuid(),
  pregunta text not null,
  opciones jsonb not null,
  abierta boolean not null default true,
  created_at timestamptz not null default now(),
  cerrada_en timestamptz
);

create table if not exists public.votos (
  votacion_id uuid not null references public.votaciones(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  opcion integer not null,
  created_at timestamptz not null default now(),
  primary key (votacion_id, user_id)
);

create table if not exists public.revisiones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text,
  mes text not null,
  enlace text not null,
  plataforma text,
  titulo text,
  artista text,
  genero text,
  bpm text,
  tonalidad text,
  calidad text,
  nota text,
  estado text not null default 'pendiente',
  respuesta text,
  respondida_en timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, mes)
);

alter table public.votaciones enable row level security;
alter table public.votos enable row level security;
alter table public.revisiones enable row level security;

revoke all on public.votaciones, public.votos, public.revisiones from anon, authenticated;
grant all on public.votaciones, public.votos, public.revisiones to service_role;

-- Devuelve 'ok', 'ya' (ya pidió una este mes) o 'lleno' (cupo del mes agotado).
create or replace function public.pedir_revision(
  p_user uuid, p_email text, p_mes text, p_cupo integer,
  p_enlace text, p_plataforma text, p_titulo text, p_artista text, p_genero text,
  p_bpm text, p_tonalidad text, p_calidad text, p_nota text
) returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(hashtext('revisiones-' || p_mes));
  if exists (select 1 from revisiones where user_id = p_user and mes = p_mes) then
    return 'ya';
  end if;
  if (select count(*) from revisiones where mes = p_mes) >= p_cupo then
    return 'lleno';
  end if;
  insert into revisiones (user_id, email, mes, enlace, plataforma, titulo, artista, genero, bpm, tonalidad, calidad, nota)
  values (p_user, p_email, p_mes, p_enlace, p_plataforma, p_titulo, p_artista, p_genero, p_bpm, p_tonalidad, p_calidad, p_nota);
  return 'ok';
end;
$$;

revoke execute on function public.pedir_revision(uuid, text, text, integer, text, text, text, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.pedir_revision(uuid, text, text, integer, text, text, text, text, text, text, text, text, text) to service_role;

-- Número de la sesión de pago de Stripe en cada compra: así un aviso repetido
-- de Stripe (reintentos) no guarda la compra dos veces (pages/api/enviar-pedido.js).
alter table public.purchases add column if not exists stripe_session_id text;
create unique index if not exists purchases_stripe_session_id_key on public.purchases (stripe_session_id) where stripe_session_id is not null;
