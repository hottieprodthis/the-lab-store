-- Boletín con doble confirmación (pages/api/boletin.js).
--
-- confirmado: la persona ha pulsado "Confirmar" en el correo (o la ha añadido
-- el admin a mano). Solo los confirmados reciben las novedades.
alter table public.suscriptores add column if not exists confirmado boolean not null default false;
alter table public.suscriptores add column if not exists confirmado_en timestamptz;

-- El alta ya la hace el servidor: se quita el permiso de que cualquiera
-- escriba directamente en la tabla desde el navegador (lo que usaban los bots).
drop policy if exists "Enable public subscriptions" on public.suscriptores;
