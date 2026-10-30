// Comprobación en el servidor de los pagos de PayPal.
//
// El botón de PayPal cobra desde el navegador, así que antes la web se fiaba
// de lo que este le contaba. Ahora, antes de guardar la compra, mandar el
// enlace de descarga o activar la suscripción, se pregunta a PayPal por el
// pedido (con la clave secreta de la cuenta, que solo está en Vercel):
//   - que exista y esté COBRADO (COMPLETED),
//   - que se haya pagado al menos lo que vale según la base de datos,
//   - en euros.
//
// Variables de entorno (Vercel): NEXT_PUBLIC_PAYPAL_CLIENT_ID (ya existe) y
// PAYPAL_CLIENT_SECRET. PAYPAL_API_BASE es opcional (por defecto la de pagos
// reales; para pruebas: https://api-m.sandbox.paypal.com).

const BASE = process.env.PAYPAL_API_BASE || 'https://api-m.paypal.com';

export function paypalConfigurado() {
  return Boolean(process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
}

async function tokenPaypal() {
  const credenciales = Buffer.from(
    `${process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString('base64');
  const r = await fetch(`${BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${credenciales}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  });
  if (!r.ok) throw new Error(`PayPal no dio acceso (${r.status})`);
  const datos = await r.json();
  return datos.access_token;
}

// Devuelve { ok: true, pagadoCents } o { ok: false, motivo }.
export async function verificarPedidoPaypal(orderId, esperadoCents, moneda = 'EUR') {
  if (typeof orderId !== 'string' || !/^[A-Z0-9-]{5,40}$/i.test(orderId)) {
    return { ok: false, motivo: 'Falta el número de pedido de PayPal o no es válido.' };
  }
  try {
    const token = await tokenPaypal();
    const r = await fetch(`${BASE}/v2/checkout/orders/${encodeURIComponent(orderId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return { ok: false, motivo: `PayPal no encuentra el pedido ${orderId} (${r.status}).` };
    const pedido = await r.json();
    if (pedido.status !== 'COMPLETED') {
      return { ok: false, motivo: `El pedido ${orderId} no está cobrado (estado: ${pedido.status}).` };
    }

    let pagadoCents = 0;
    for (const unidad of pedido.purchase_units || []) {
      for (const cobro of unidad?.payments?.captures || []) {
        if (cobro.status !== 'COMPLETED') continue;
        if (String(cobro.amount?.currency_code).toUpperCase() !== moneda) {
          return { ok: false, motivo: `El pedido ${orderId} se pagó en otra moneda (${cobro.amount?.currency_code}).` };
        }
        pagadoCents += Math.round(parseFloat(cobro.amount?.value) * 100);
      }
    }
    if (!(pagadoCents >= esperadoCents)) {
      return {
        ok: false,
        motivo: `En el pedido ${orderId} se pagaron ${(pagadoCents / 100).toFixed(2)} € y debía costar ${(esperadoCents / 100).toFixed(2)} €.`,
      };
    }
    // Nombre y país del pagador, para los avisos de compras (lib/avisoCompras.js).
    const pagador = {
      nombreCompleto: pedido.payer?.name?.given_name || '',
      pais: pedido.payer?.address?.country_code || pedido.purchase_units?.[0]?.shipping?.address?.country_code || '',
    };
    return { ok: true, pagadoCents, pagador };
  } catch (e) {
    return { ok: false, motivo: `No se pudo comprobar el pedido ${orderId} con PayPal: ${e.message}` };
  }
}
