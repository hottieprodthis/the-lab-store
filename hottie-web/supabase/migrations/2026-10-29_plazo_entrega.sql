-- Plazo de entrega / duracion opcional que sale en tarjetas y fichas de servicios y clases.
alter table public.services add column if not exists plazo_entrega text;
alter table public.classes add column if not exists plazo_entrega text;
