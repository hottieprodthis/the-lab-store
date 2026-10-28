// "Web en obras": interruptor del panel de admin (ajuste "maintenance" de la
// tabla settings, valor JSON { activa, mensaje }). Mientras está activo, la
// tienda, los servicios, las clases y sus fichas muestran un aviso en vez del
// catálogo (pages/_app.js + components/AvisoObras.js) y no se puede pagar
// ningún pedido (la suscripción sí sigue funcionando).

export const MENSAJE_OBRAS_POR_DEFECTO =
  'Estamos actualizando la tienda, los servicios y las clases para traerte novedades. Volveremos a abrir lo antes posible.';

export function leerAjusteObras(valor) {
  try {
    const v = typeof valor === 'string' ? JSON.parse(valor || '{}') : valor || {};
    if (!v.activa) return null;
    return { activa: true, mensaje: String(v.mensaje || '').trim() || MENSAJE_OBRAS_POR_DEFECTO };
  } catch (e) {
    return null;
  }
}

// Lee el ajuste. Si algo falla, la web sigue abierta (mejor vender que
// cerrar la tienda por un error).
export async function leerObras(supabase) {
  try {
    const { data } = await supabase.from('settings').select('value').eq('key', 'maintenance').maybeSingle();
    return leerAjusteObras(data?.value);
  } catch (e) {
    return null;
  }
}

// ---------------------------------------------------------------------------
// "De vacaciones": otro interruptor del panel (ajuste "vacation", valor JSON
// { activa, mensaje, vuelta: 'AAAA-MM-DD' opcional }). La tienda sigue
// vendiendo (las descargas llegan solas); en Servicios y Clases sale una
// franja y un aviso (components/AvisoVacaciones.js) y no se puede reservar
// (pages/api/disponibilidad.js y checkout.js). Si hay fecha de vuelta, las
// reservas se abren solas ese día.

export const MENSAJE_VACACIONES_POR_DEFECTO =
  'Hasta los productores necesitamos recargar los oídos. Estos días no aceptamos reservas de servicios ni clases, pero la tienda sigue abierta: los kits se descargan al momento.';

const hoyMadrid = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' });

export function textoVuelta(vuelta) {
  if (!vuelta) return '';
  const d = new Date(`${vuelta}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', timeZone: 'UTC' });
}

export function leerAjusteVacaciones(valor) {
  try {
    const v = typeof valor === 'string' ? JSON.parse(valor || '{}') : valor || {};
    if (!v.activa) return null;
    const vuelta = /^\d{4}-\d{2}-\d{2}$/.test(v.vuelta || '') ? v.vuelta : '';
    if (vuelta && hoyMadrid() >= vuelta) return null; // ya ha vuelto
    return {
      activa: true,
      mensaje: String(v.mensaje || '').trim() || MENSAJE_VACACIONES_POR_DEFECTO,
      vuelta,
    };
  } catch (e) {
    return null;
  }
}

export async function leerVacaciones(supabase) {
  try {
    const { data } = await supabase.from('settings').select('value').eq('key', 'vacation').maybeSingle();
    return leerAjusteVacaciones(data?.value);
  } catch (e) {
    return null;
  }
}

export function mensajeReservasVacaciones(vac) {
  const vuelta = textoVuelta(vac?.vuelta);
  return `Estamos de vacaciones${vuelta ? ` hasta el ${vuelta}` : ''}: ahora mismo no se pueden reservar servicios ni clases. La tienda sigue abierta.`;
}

// Para getServerSideProps de las páginas de catálogo: añade "obras" a las
// props y, si está activo, responde 503 ("vuelve luego") para que Google no
// guarde el aviso en lugar de la página. Con { vacaciones: true } (servicios
// y clases) añade también el aviso de vacaciones; esas páginas siguen
// respondiendo con normalidad (pueden ser semanas).
export async function propsConObras(supabase, res, props, { vacaciones = false } = {}) {
  const obras = await leerObras(supabase);
  if (obras && res) {
    res.statusCode = 503;
    res.setHeader('Retry-After', '3600');
  }
  const vac = vacaciones ? await leerVacaciones(supabase) : null;
  return { props: { ...props, obras, vacaciones: vac } };
}

export const MENSAJE_PAGO_EN_OBRAS =
  'Ahora mismo la web está en obras y no se pueden hacer compras. Volveremos a abrir lo antes posible, ¡gracias por la paciencia!';
