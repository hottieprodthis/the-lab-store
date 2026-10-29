-- Funciones internas mas cerradas (avisos de seguridad de Supabase).
-- Las de los disparadores ya no se pueden llamar desde fuera; siguen funcionando como disparadores.
alter function public.activar_mi_suscripcion() set search_path = '';
alter function public.funcion_notificar_nuevo_producto() set search_path = '';
alter function public.get_user_id_by_email(text) set search_path = '';
revoke execute on function public.funcion_notificar_nuevo_producto() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
