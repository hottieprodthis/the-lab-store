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

// Fin según una suscripción de Stripe (en las versiones nuevas de la API el
// final del periodo está en cada línea de la suscripción).
export function finSegunStripe(suscripcion) {
  const segundos = suscripcion?.current_period_end ?? suscripcion?.items?.data?.[0]?.current_period_end;
  if (!Number.isFinite(Number(segundos))) return null;
  return new Date((Number(segundos) + DIAS_MARGEN_STRIPE * 86400) * 1000);
}
