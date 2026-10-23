import { createHmac, timingSafeEqual } from 'crypto';

// Enlaces de "Darme de baja" de los correos de novedades (solo servidor).
//
// Cada enlace lleva el email y una firma que solo puede calcular el servidor,
// así nadie puede dar de baja a otra persona cambiando el email del enlace.
const SITIO = 'https://hottieprodthis.com';

function clave() {
  return `baja-novedades:${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}`;
}

export function normalizarEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export function firmaBaja(email) {
  return createHmac('sha256', clave()).update(normalizarEmail(email)).digest('hex').slice(0, 32);
}

export function firmaBajaValida(email, firma) {
  if (typeof firma !== 'string' || firma.length !== 32 || !normalizarEmail(email)) return false;
  const esperada = Buffer.from(firmaBaja(email));
  const recibida = Buffer.from(firma);
  return esperada.length === recibida.length && timingSafeEqual(esperada, recibida);
}

function consulta(email) {
  return `email=${encodeURIComponent(normalizarEmail(email))}&t=${firmaBaja(email)}`;
}

// Página donde la persona confirma la baja (pages/baja.js).
export function enlaceBaja(email) {
  return `${SITIO}/baja?${consulta(email)}`;
}

// Cabeceras para que Gmail y otros muestren su botón de "Cancelar suscripción"
// de un clic (llama directamente a pages/api/baja.js).
export function cabecerasBaja(email) {
  return {
    'List-Unsubscribe': `<${SITIO}/api/baja?${consulta(email)}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };
}
