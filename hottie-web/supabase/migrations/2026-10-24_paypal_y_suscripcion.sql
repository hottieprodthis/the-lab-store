-- 1) Número de pedido de PayPal en cada compra, para no registrar dos veces
--    el mismo pago (pages/api/registrar-pago-paypal.js).
alter table public.purchases add column if not exists paypal_order_id text;
create unique index if not exists purchases_paypal_order_id_key
  on public.purchases (paypal_order_id) where paypal_order_id is not null;

-- 2) La suscripción ya la activa el servidor tras comprobar el pago
--    (pages/api/activar-suscripcion.js y registrar-pago-paypal.js). Se quita
--    el permiso de que el navegador llame a activar_mi_suscripcion, que
--    activaba la suscripción a cualquiera con cuenta sin comprobar ningún pago.
revoke execute on function public.activar_mi_suscripcion() from public, anon, authenticated;
