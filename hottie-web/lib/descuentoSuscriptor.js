import { suscripcionActiva } from './suscripcion';

// Descuento para los suscriptores del área de clientes (mensual o de por
// vida) en la tienda, los servicios y/o las clases.
//
// El admin lo elige en el panel (settings "subscriber_discount"):
//   { porcentaje: 10, tipos: ['producto', 'servicio', 'clase'], hasta: ISO | null }
// porcentaje 0, ningún tipo o "hasta" ya pasado = apagado.
//
// No se suma a las ofertas: si el artículo ya está de oferta, se queda con el
// precio de la oferta. Funciona igual en el navegador y en el servidor.
export const TIPOS_DESCUENTO = [
  { valor: 'producto', texto: 'Tienda (kits y packs)' },
  { valor: 'servicio', texto: 'Servicios' },
  { valor: 'clase', texto: 'Clases' },
];

export function leerDescuento(valorAjuste, ahora = new Date()) {
  let d = valorAjuste;
  if (!d) return null;
  if (typeof d === 'string') {
    try {
      d = JSON.parse(d);
    } catch (e) {
      return null;
    }
  }
  const porcentaje = Math.round(Number(d?.porcentaje));
  const tipos = Array.isArray(d?.tipos) ? d.tipos.filter((t) => TIPOS_DESCUENTO.some((x) => x.valor === t)) : [];
  if (!(porcentaje >= 1 && porcentaje <= 90) || tipos.length === 0) return null;
  if (d.hasta) {
    const hasta = new Date(d.hasta);
    if (!Number.isNaN(hasta.getTime()) && hasta <= ahora) return null;
  }
  return { porcentaje, tipos, hasta: d.hasta || null };
}

// % que toca a ese tipo de artículo (0 si no entra en el descuento).
export function porcentajePara(descuento, tipo) {
  return descuento && descuento.tipos.includes(tipo) ? descuento.porcentaje : 0;
}

export function rebajaSuscriptor(cents, porcentaje) {
  const base = Math.round(Number(cents));
  if (!(base > 0) || !(porcentaje > 0)) return base;
  return Math.round((base * (100 - porcentaje)) / 100);
}

// Precio final (céntimos) de un artículo ya calculado con su oferta: si la
// fila está de oferta, no se toca.
export function precioConDescuento(cents, filaConOferta, tipo, descuento) {
  if (filaConOferta?.oferta) return cents;
  return rebajaSuscriptor(cents, porcentajePara(descuento, tipo));
}

// Copia de la fila con los precios de suscriptor, en el mismo formato que una
// oferta (fila.oferta y plan.precio_original) para que las fichas enseñen el
// precio normal tachado sin cambiar nada más. Lleva además
// fila.descuentoSuscriptor = % (para el aviso "Precio de suscriptor").
export function filaConDescuento(fila, tipo, descuento) {
  const pct = porcentajePara(descuento, tipo);
  if (!fila || !pct || fila.oferta) return fila;
  const copia = { ...fila, descuentoSuscriptor: pct };
  if (Array.isArray(fila.plans) && fila.plans.length > 0) {
    copia.plans = fila.plans.map((plan) => {
      const base = Math.round(parseFloat(plan?.price) * 100);
      if (!(base > 0)) return plan;
      return { ...plan, price: rebajaSuscriptor(base, pct) / 100, precio_original: plan.price };
    });
  }
  const precioBase = Number(fila.price_cents) || Math.round(Number(fila.price || 0) * 100);
  if (precioBase > 0) {
    copia.price_cents = rebajaSuscriptor(precioBase, pct);
    if (fila.price) copia.price = copia.price_cents / 100;
  }
  copia.oferta = { fin: null, precio_original_cents: precioBase };
  return copia;
}

// Precio unitario (euros) de una línea del carrito. Las líneas que se
// añadieron ya con el precio de suscriptor (o de oferta) se quedan como están.
export function precioLineaCarrito(item, descuento) {
  const euros = item.price || (item.price_cents ? item.price_cents / 100 : 0);
  if (!euros || item.descuentoSuscriptor || item.oferta) return euros;
  const tipo = item.isClass ? 'clase' : item.isService ? 'servicio' : 'producto';
  return rebajaSuscriptor(Math.round(euros * 100), porcentajePara(descuento, tipo)) / 100;
}

// --- Servidor ---
// Descuento que corresponde a quien hace la petición: solo si viene con la
// sesión de un suscriptor activo (cabecera Authorization). Si no, null.
export async function descuentoDePeticion(supabase, req) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return null;
    const { data: ajuste } = await supabase.from('settings').select('value').eq('key', 'subscriber_discount').maybeSingle();
    const descuento = leerDescuento(ajuste?.value);
    if (!descuento) return null;
    const { data: datos } = await supabase.auth.getUser(token);
    if (!datos?.user) return null;
    const { data: perfil } = await supabase
      .from('profiles')
      .select('is_admin, is_subscribed, subscribed_until')
      .eq('id', datos.user.id)
      .maybeSingle();
    return suscripcionActiva(perfil) ? descuento : null;
  } catch (e) {
    console.error('descuentoDePeticion:', e.message);
    return null;
  }
}
