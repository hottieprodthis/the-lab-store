import Stripe from 'stripe';

// Los formularios de después de pagar (briefing de servicio, seguimiento y
// clase) solo se abren y solo se envían con el justificante de un pago real
// que incluya un servicio o una clase:
//   - session_id: pago con tarjeta (se pregunta a Stripe),
//   - paypal: número de pedido de PayPal ya comprobado y guardado en purchases,
//   - compra: id de una compra gratis (0 €) guardada en purchases.
// El justificante vale 30 días. Solo para el servidor (pages/api).
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-06-20' });
const DIAS_VALIDEZ = 30;

const SIN_PAGO = { ok: false, servicio: false, clase: false };

function reciente(fecha) {
  const t = new Date(fecha).getTime();
  return Number.isFinite(t) && Date.now() - t <= DIAS_VALIDEZ * 86400000;
}

function tiposDeCompra(items) {
  const tipos = (Array.isArray(items) ? items : []).map((i) => i?.type);
  return { servicio: tipos.includes('servicio'), clase: tipos.includes('clase') };
}

// Justificante que viene en la dirección de la página o en el formulario.
export function referenciaPago(datos = {}) {
  const limpio = (v, re) => (typeof v === 'string' && re.test(v) ? v : null);
  return {
    sessionId: limpio(datos.session_id, /^cs_[A-Za-z0-9_]{10,200}$/),
    paypal: limpio(datos.paypal, /^[A-Z0-9-]{5,40}$/i),
    // El id de las compras es un número (purchases.id).
    compra: limpio(datos.compra, /^[0-9]{1,12}$/),
  };
}

// { ok, servicio, clase }: qué formularios corresponden a ese pago.
export async function comprobarPagoBriefing(supabase, ref) {
  try {
    if (ref.sessionId) {
      const sesion = await stripe.checkout.sessions.retrieve(ref.sessionId);
      const pagada = sesion.status === 'complete' && ['paid', 'no_payment_required'].includes(sesion.payment_status);
      if (!pagada || sesion.mode !== 'payment' || !reciente(sesion.created * 1000)) return SIN_PAGO;
      let carrito = [];
      try {
        carrito = JSON.parse(sesion.metadata?.cart_data || '[]');
      } catch (e) {
        carrito = [];
      }
      const tipos = { servicio: carrito.some((i) => i?.y === 'servicio'), clase: carrito.some((i) => i?.y === 'clase') };
      return { ok: tipos.servicio || tipos.clase, ...tipos };
    }
    if (ref.paypal || ref.compra) {
      const consulta = supabase.from('purchases').select('items, created_at').limit(1);
      const { data } = ref.paypal ? await consulta.eq('paypal_order_id', ref.paypal) : await consulta.eq('id', ref.compra);
      const compra = data?.[0];
      if (!compra || !reciente(compra.created_at)) return SIN_PAGO;
      const tipos = tiposDeCompra(compra.items);
      return { ok: tipos.servicio || tipos.clase, ...tipos };
    }
  } catch (e) {
    console.error('comprobarPagoBriefing:', e.message);
  }
  return SIN_PAGO;
}
