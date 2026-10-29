// "Web en obras": interruptores del panel de admin (ajuste "maintenance" de
// la tabla settings, valor JSON { activa, mensaje, modo }). Tres modos; las
// páginas tapadas muestran un aviso (pages/_app.js + components/AvisoObras.js):
//  - 'obras': se tapa toda la web (salvo las páginas legales y la de darse de
//    baja del boletín) y no se puede pagar nada.
//  - 'privada' ("solo portada y contacto"): se ven la portada y Contacto; no
//    se puede pagar nada.
//  - 'compras' ("compras cerradas"): se ven la portada, Contacto, la FAQ y el
//    área de clientes; se tapan Tienda, Servicios y Clases y no se puede
//    pagar nada, salvo que un cliente que ya lo era renueve la suscripción.
// En todos, el admin (con la sesión del panel abierta) lo ve todo y puede
// pagar para hacer pruebas, y el buscador no enseña resultados a los demás.
const MODOS = ['obras', 'privada', 'compras'];

export const MENSAJE_OBRAS_POR_DEFECTO =
  'Estamos actualizando la tienda, los servicios y las clases para traerte novedades. Volveremos a abrir lo antes posible.';

export function leerAjusteObras(valor) {
  try {
    const v = typeof valor === 'string' ? JSON.parse(valor || '{}') : valor || {};
    if (!v.activa) return null;
    return {
      activa: true,
      mensaje: String(v.mensaje || '').trim() || MENSAJE_OBRAS_POR_DEFECTO,
      modo: MODOS.includes(v.modo) ? v.modo : 'obras',
    };
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

// Para getServerSideProps de las páginas de catálogo (se tapan en cualquier
// modo): añade "obras" a las props y, si está activo, responde 503 ("vuelve
// luego") para que Google no guarde el aviso en lugar de la página. Con { vacaciones: true } (servicios
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

export const MENSAJE_COMPRAS_CERRADAS =
  'Ahora mismo las compras están cerradas. Si ya eres cliente, puedes seguir entrando en tu área. Volveremos a abrir lo antes posible.';

// Qué modos tapan cada tipo de página (el catálogo usa propsConObras).
const TAPAN = {
  portada: ['obras'], // portada y Contacto
  general: ['obras', 'privada'], // FAQ, acceso, área de clientes, formularios tras pagar…
};

// Para getServerSideProps de las páginas que no son de catálogo.
export async function propsSegunObras(supabase, res, tipo, props = {}) {
  const ajuste = await leerObras(supabase);
  const obras = ajuste && TAPAN[tipo]?.includes(ajuste.modo) ? ajuste : null;
  if (obras && res) {
    res.statusCode = 503;
    res.setHeader('Retry-After', '3600');
  }
  return { props: { ...props, obras } };
}

// ¿La petición viene del admin? (token de la sesión del panel en la cabecera
// x-admin-token, ver lib/cabecerasPago.js). Necesita el cliente con la
// Service Role Key.
export async function esAdminPeticion(supabase, req) {
  const token = req?.headers?.['x-admin-token'];
  if (!token) return false;
  try {
    const { data } = await supabase.auth.getUser(String(token));
    if (!data?.user) return false;
    const { data: perfil } = await supabase.from('profiles').select('is_admin').eq('id', data.user.id).maybeSingle();
    return Boolean(perfil?.is_admin);
  } catch (e) {
    return false;
  }
}

// ¿Ese usuario ya es (o ha sido) suscriptor? Para dejarle renovar con las
// compras cerradas.
async function yaEsCliente(supabase, userId) {
  if (!userId) return false;
  try {
    const { data } = await supabase
      .from('profiles')
      .select('is_subscribed, subscribed_until, stripe_subscription_id')
      .eq('id', userId)
      .maybeSingle();
    return Boolean(data && (data.is_subscribed || data.subscribed_until || data.stripe_subscription_id));
  } catch (e) {
    return false;
  }
}

// Si la web está cerrada, devuelve el mensaje con el que se rechaza el pago
// (o null si se puede pagar).
export async function bloqueoPagoObras(supabase, req, { esSuscripcion = false, userId = null } = {}) {
  const obras = await leerObras(supabase);
  if (!obras) return null;
  if (await esAdminPeticion(supabase, req)) return null;
  if (obras.modo === 'compras') {
    return esSuscripcion && (await yaEsCliente(supabase, userId)) ? null : MENSAJE_COMPRAS_CERRADAS;
  }
  return MENSAJE_PAGO_EN_OBRAS;
}
