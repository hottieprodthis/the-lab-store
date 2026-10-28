import { createHmac, timingSafeEqual } from 'crypto';

// Opiniones de clientes (tabla opiniones; solo servidor).
//
// Solo puede opinar quien ha comprado: cada compra tiene su enlace personal
// (/opinion?c=ID&t=FIRMA) con una firma que solo calcula el servidor, así
// nadie puede inventarse opiniones cambiando el número de compra. Una opinión
// por compra. Salen en la web cuando el admin las aprueba en el panel.
const SITIO = 'https://hottieprodthis.com';

// Días después de la compra en que se pide la opinión por correo
// (pages/api/cron/pedir-opinion.js); pasado el máximo ya no se pide.
export const DIAS_PEDIR_OPINION = 5;
export const DIAS_MAX_PEDIR_OPINION = 30;

function clave() {
  return `opiniones:${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}`;
}

export function firmaOpinion(compraId) {
  return createHmac('sha256', clave()).update(String(compraId)).digest('hex').slice(0, 32);
}

export function firmaOpinionValida(compraId, firma) {
  if (typeof firma !== 'string' || firma.length !== 32 || !/^\d+$/.test(String(compraId || ''))) return false;
  const esperada = Buffer.from(firmaOpinion(compraId));
  const recibida = Buffer.from(firma);
  return esperada.length === recibida.length && timingSafeEqual(esperada, recibida);
}

export function enlaceOpinion(compraId) {
  return `${SITIO}/opinion?c=${compraId}&t=${firmaOpinion(compraId)}`;
}

// Nombre corto de lo que se compró, para el correo y la opinión.
export function articuloDeCompra(compra) {
  const items = Array.isArray(compra?.items) ? compra.items : [];
  if (items.length > 1) return items.map((i) => i.title || i.name).filter(Boolean).slice(0, 3).join(', ');
  return String(compra?.plan_name || items[0]?.title || items[0]?.name || 'tu compra').slice(0, 120);
}

// Las suscripciones no se piden opinión (es acceso a contenido, no un trabajo).
export function esSuscripcion(compra) {
  return /suscrip/i.test(String(compra?.plan_name || ''));
}
