-- Ofertas por tiempo limitado en productos, servicios y clases.
--
-- oferta_tipo:   'porcentaje' (descuento en %) o 'precio' (precio nuevo).
-- oferta_valor:  el % de descuento, o el precio nuevo en euros si no hay planes.
--                (Con planes y tipo 'precio', el precio nuevo de cada plan se
--                guarda dentro del propio plan, en "oferta_precio".)
-- oferta_inicio / oferta_fin: cuándo empieza y cuándo termina la oferta.
--
-- Fuera de esas fechas la web cobra y enseña el precio normal: no hay que
-- quitar nada a mano cuando la oferta termina.
--
-- Se puede ejecutar más de una vez sin problema. No cambia ningún precio.

alter table public.products add column if not exists oferta_tipo text;
alter table public.products add column if not exists oferta_valor numeric;
alter table public.products add column if not exists oferta_inicio timestamptz;
alter table public.products add column if not exists oferta_fin timestamptz;

alter table public.services add column if not exists oferta_tipo text;
alter table public.services add column if not exists oferta_valor numeric;
alter table public.services add column if not exists oferta_inicio timestamptz;
alter table public.services add column if not exists oferta_fin timestamptz;

alter table public.classes add column if not exists oferta_tipo text;
alter table public.classes add column if not exists oferta_valor numeric;
alter table public.classes add column if not exists oferta_inicio timestamptz;
alter table public.classes add column if not exists oferta_fin timestamptz;
