-- Permisos: solo la cuenta admin (profiles.is_admin) puede cambiar el catálogo,
-- los ajustes, los posts/packs y ver la lista de suscriptores.
--
-- Antes había políticas "ALL ... to authenticated using (true)": cualquier
-- persona con una cuenta de cliente podía cambiar precios, productos, ajustes
-- (precio de la suscripción) o leer/borrar los emails del boletín.
--
-- Se mantienen: la lectura pública del catálogo y de los ajustes, el alta en
-- el boletín desde la home y lo de profiles/purchases (cada uno ve lo suyo).

begin;

drop policy if exists "Permitir todo a autenticados en products" on public.products;
drop policy if exists "Modificacion admin productos" on public.products;
drop policy if exists "Permitir todo a autenticados en services" on public.services;
drop policy if exists "Modificacion admin servicios" on public.services;
drop policy if exists "Permitir todo a autenticados en classes" on public.classes;
drop policy if exists "Modificacion admin clases" on public.classes;
drop policy if exists "Modificacion admin settings" on public.settings;
drop policy if exists "Modificacion admin suscriptores" on public.suscriptores;
drop policy if exists "Permitir todo a autenticados en posts" on public.posts;
drop policy if exists "Permitir todo a autenticados en packs" on public.packs;

create policy "Solo admins modifican productos" on public.products for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

create policy "Solo admins modifican servicios" on public.services for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

create policy "Solo admins modifican clases" on public.classes for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

create policy "Solo admins modifican settings" on public.settings for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

create policy "Solo admins gestionan suscriptores" on public.suscriptores for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

-- Posts y packs exclusivos: antes los podía leer cualquier cuenta, aunque no
-- pagase la suscripción. Ahora solo suscriptores (profiles.is_subscribed) y admin.
drop policy if exists "Solo usuarios autenticados ven posts" on public.posts;
drop policy if exists "Solo usuarios autenticados ven packs" on public.packs;

create policy "Solo suscriptores ven posts" on public.posts for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and (p.is_subscribed = true or p.is_admin = true)));

create policy "Solo suscriptores ven packs" on public.packs for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and (p.is_subscribed = true or p.is_admin = true)));

commit;
