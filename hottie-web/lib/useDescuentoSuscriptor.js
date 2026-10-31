import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { leerDescuento } from './descuentoSuscriptor';
import { suscripcionActiva } from './suscripcion';

// En el navegador: { descuento, suscrito } para enseñar los precios de
// suscriptor (lib/descuentoSuscriptor.js). Se pregunta una sola vez por
// sesión aunque haya muchas tarjetas en la página.
const SIN_DESCUENTO = { descuento: null, suscrito: false };
let cache = { clave: null, promesa: null };

async function cargar(session) {
  const { data: ajuste } = await supabase.from('settings').select('value').eq('key', 'subscriber_discount').maybeSingle();
  const descuento = leerDescuento(ajuste?.value);
  if (!descuento || !session) return { descuento, suscrito: false };
  const { data: perfil } = await supabase
    .from('profiles')
    .select('is_admin, is_subscribed, subscribed_until')
    .eq('id', session.user.id)
    .maybeSingle();
  return { descuento, suscrito: suscripcionActiva(perfil) };
}

export function useDescuentoSuscriptor() {
  const [estado, setEstado] = useState(SIN_DESCUENTO);
  useEffect(() => {
    let vivo = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        const session = data?.session || null;
        const clave = session?.user?.id || 'anonimo';
        if (cache.clave !== clave) cache = { clave, promesa: cargar(session).catch(() => SIN_DESCUENTO) };
        return cache.promesa;
      })
      .then((e) => {
        if (vivo) setEstado(e);
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, []);
  return estado;
}
