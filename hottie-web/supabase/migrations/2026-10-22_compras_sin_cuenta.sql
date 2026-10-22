-- Compras de gente SIN cuenta en la web.
--
-- Hasta ahora, si alguien pagaba con un email que no tenía cuenta, la compra
-- no se guardaba en "purchases": no gastaba cupo ni salía en estadísticas.
-- Desde este cambio se guardan con user_id vacío y el email del comprador.
--
-- Se puede ejecutar más de una vez sin problema. No borra ni cambia ninguna
-- compra existente.

-- 1) Columna para el email del comprador (solo se rellena en compras sin cuenta).
alter table public.purchases add column if not exists email text;

-- 2) Permitir compras sin usuario (si la columna ya lo permitía, no hace nada).
alter table public.purchases alter column user_id drop not null;
