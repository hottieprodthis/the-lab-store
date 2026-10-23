-- La suscripción del área de clientes caduca (antes duraba para siempre).
--
-- profiles.subscribed_until: hasta cuándo tiene acceso. La rellena el
-- servidor al pagar (PayPal: 1 mes; tarjeta: el periodo cobrado por Stripe)
-- y la quita si Stripe cancela la suscripción.
--
-- Posts y packs exclusivos: solo los ve el admin o quien tenga la
-- suscripción activa Y sin caducar.

alter table public.profiles add column if not exists subscribed_until timestamptz;

create or replace function public.tiene_suscripcion_activa()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (p.is_admin = true or (p.is_subscribed = true and p.subscribed_until > now()))
  );
$$;

drop policy if exists "Solo suscriptores ven posts" on public.posts;
drop policy if exists "Solo suscriptores ven packs" on public.packs;

create policy "Solo suscriptores ven posts" on public.posts for select to authenticated
  using (public.tiene_suscripcion_activa());

create policy "Solo suscriptores ven packs" on public.packs for select to authenticated
  using (public.tiene_suscripcion_activa());
