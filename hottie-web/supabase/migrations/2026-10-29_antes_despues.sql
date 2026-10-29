-- Antes y despues de cada servicio: dos MP3 (sin mezclar y mezclado) para el reproductor de components/AntesDespues.js.
alter table public.services add column if not exists antes_url text;
alter table public.services add column if not exists despues_url text;
