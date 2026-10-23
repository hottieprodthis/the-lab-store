// Hasta cuándo dura la suscripción del área de clientes (profiles.subscribed_until).
//
// - PayPal: cada pago da 1 mes. Si se renueva antes de que acabe, el mes se
//   suma al final (no se pierden días).
// - Tarjeta (Stripe): hasta el final del periodo que Stripe ya ha cobrado,
//   más unos días de margen por si el siguiente cobro se retrasa (Stripe
//   reintenta los cobros fallidos). Cada cobro nuevo lo alarga; si Stripe la
//   cancela, se quita el acceso (pages/api/enviar-pedido.js).
// El acceso a posts y packs lo decide Supabase con esta misma fecha
// (supabase/migrations/2026-10-24_caducidad_suscripcion.sql).

export const DIAS_MARGEN_STRIPE = 3;

// ¿Tiene acceso ahora mismo? (el admin siempre).
export function suscripcionActiva(perfil, ahora = new Date()) {
  if (!perfil) return false;
  if (perfil.is_admin) return true;
  if (!perfil.is_subscribed || !perfil.subscribed_until) return false;
  const fin = new Date(perfil.subscribed_until);
  return !Number.isNaN(fin.getTime()) && fin > ahora;
}

// Nuevo fin tras pagar 1 mes con PayPal.
export function finTrasMesPaypal(finActual, ahora = new Date()) {
  const actual = finActual ? new Date(finActual) : null;
  const base = actual && !Number.isNaN(actual.getTime()) && actual > ahora ? actual : ahora;
  const fin = new Date(base);
  fin.setMonth(fin.getMonth() + 1);
  return fin;
}

// --- Cambios de precio de la suscripción (settings "subscription_price_change") ---
// Al cambiar el precio en el admin se guarda { nuevo_cents, anterior_cents, desde }:
//   - Si SUBE: "desde" = 30 días después del aviso. Los que ya están suscritos
//     siguen pagando el precio anterior en las renovaciones de antes de esa
//     fecha, y el nuevo a partir de ella.
//   - Si BAJA: "desde" = ese mismo momento (pagan menos en su próxima renovación).
// Quien se suscribe nuevo paga siempre el precio actual.
export const DIAS_AVISO_SUBIDA = 30;

export function leerCambioPrecio(valor) {
  if (!valor) return null;
  if (typeof valor === 'object') return valor;
  try {
    return JSON.parse(valor);
  } catch (e) {
    return null;
  }
}

// Fecha desde la que se aplica un cambio de precio hecho "ahora".
export function desdeCambioPrecio(anteriorCents, nuevoCents, ahora = new Date()) {
  if (nuevoCents > anteriorCents) return new Date(ahora.getTime() + DIAS_AVISO_SUBIDA * 86400000);
  return new Date(ahora);
}

// Precio mensual (céntimos) que toca pagar a quien YA está suscrito al
// renovar en la fecha "cuando": el anterior si la subida aún no ha llegado.
// "alta" = cuándo empezó su suscripción: quien se suscribió después del
// cambio ya paga el precio nuevo desde el principio.
export function precioRenovacion(precioActualCents, cambio, cuando = new Date(), alta = null) {
  if (!cambio || !cambio.desde || !Number.isFinite(Number(cambio.anterior_cents))) return precioActualCents;
  if (alta && cambio.hecho_en && new Date(alta) >= new Date(cambio.hecho_en)) return precioActualCents;
  const desde = new Date(cambio.desde);
  if (Number.isNaN(desde.getTime())) return precioActualCents;
  return cuando < desde ? Number(cambio.anterior_cents) : precioActualCents;
}

// Cuándo empezó una suscripción de Stripe.
export function altaStripe(suscripcion) {
  const segundos = suscripcion?.start_date ?? suscripcion?.created;
  return Number.isFinite(Number(segundos)) ? new Date(Number(segundos) * 1000) : null;
}

// Fecha de la próxima renovación de una suscripción de Stripe (sin margen).
export function proximaRenovacionStripe(suscripcion) {
  const segundos = suscripcion?.current_period_end ?? suscripcion?.items?.data?.[0]?.current_period_end;
  return Number.isFinite(Number(segundos)) ? new Date(Number(segundos) * 1000) : null;
}

// Pone a una suscripción de Stripe el precio mensual "objetivoCents" para los
// próximos cobros (sin cobrar ni devolver nada ahora). Devuelve true si la ha
// cambiado y false si ya tenía ese precio.
export async function ajustarPrecioStripe(stripe, suscripcion, objetivoCents) {
  const linea = suscripcion?.items?.data?.[0];
  if (!linea || !Number.isFinite(Number(objetivoCents))) return false;
  if (linea.price?.unit_amount === objetivoCents) return false;
  const producto = typeof linea.price?.product === 'string' ? linea.price.product : linea.price?.product?.id;
  await stripe.subscriptions.update(suscripcion.id, {
    items: [
      {
        id: linea.id,
        price_data: {
          currency: linea.price?.currency || 'eur',
          product: producto,
          unit_amount: objetivoCents,
          recurring: { interval: 'month' },
        },
      },
    ],
    proration_behavior: 'none',
  });
  return true;
}

// Fin según una suscripción de Stripe (en las versiones nuevas de la API el
// final del periodo está en cada línea de la suscripción).
export function finSegunStripe(suscripcion) {
  const segundos = suscripcion?.current_period_end ?? suscripcion?.items?.data?.[0]?.current_period_end;
  if (!Number.isFinite(Number(segundos))) return null;
  return new Date((Number(segundos) + DIAS_MARGEN_STRIPE * 86400) * 1000);
}
