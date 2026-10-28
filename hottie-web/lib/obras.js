// "Web en obras": interruptor del panel de admin (ajuste "maintenance" de la
// tabla settings, valor JSON { activa, mensaje }). Mientras está activo, la
// tienda, los servicios, las clases y sus fichas muestran un aviso en vez del
// catálogo (pages/_app.js + components/AvisoObras.js) y no se puede pagar
// ningún pedido (la suscripción sí sigue funcionando).

export const MENSAJE_OBRAS_POR_DEFECTO =
  'Estamos actualizando la tienda, los servicios y las clases para traerte novedades. Vuelve en unas horas.';

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

// Para getServerSideProps de las páginas de catálogo: añade "obras" a las
// props y, si está activo, responde 503 ("vuelve luego") para que Google no
// guarde el aviso en lugar de la página.
export async function propsConObras(supabase, res, props) {
  const obras = await leerObras(supabase);
  if (obras && res) {
    res.statusCode = 503;
    res.setHeader('Retry-After', '3600');
  }
  return { props: { ...props, obras } };
}

export const MENSAJE_PAGO_EN_OBRAS =
  'Ahora mismo la web está en obras y no se pueden hacer compras. Vuelve en unas horas, ¡gracias por la paciencia!';
