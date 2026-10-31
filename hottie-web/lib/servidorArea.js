import { createClient } from '@supabase/supabase-js';
import { CUPO_REVISIONES_DEFECTO_PANEL } from './revisiones';

// Utilidades de servidor para los extras del área de clientes (insignias,
// votaciones, revisiones de temas). Solo se usan dentro de pages/api.
export const supabaseServidor = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export const CUPO_REVISIONES_DEFECTO = CUPO_REVISIONES_DEFECTO_PANEL;
export const CORREO_ADMIN = 'pedidos.thelab@gmail.com';

// Usuario de la sesión que manda la petición (Authorization: Bearer ...).
export async function usuarioDePeticion(req) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;
  const { data } = await supabaseServidor.auth.getUser(token);
  return data?.user || null;
}

// Igual, pero solo si la cuenta es admin (profiles.is_admin).
export async function adminDePeticion(req) {
  const usuario = await usuarioDePeticion(req);
  if (!usuario) return null;
  const { data: perfil } = await supabaseServidor.from('profiles').select('is_admin').eq('id', usuario.id).maybeSingle();
  return perfil?.is_admin ? usuario : null;
}

// "2026-11" según la hora de España (el cupo de revisiones va por meses).
export function mesActual(ahora = new Date()) {
  const partes = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit' }).formatToParts(ahora);
  const anio = partes.find((p) => p.type === 'year').value;
  const mes = partes.find((p) => p.type === 'month').value;
  return `${anio}-${mes}`;
}

export function nombreMes(clave) {
  const [anio, mes] = String(clave).split('-').map(Number);
  if (!anio || !mes) return clave;
  return new Date(Date.UTC(anio, mes - 1, 15)).toLocaleDateString('es-ES', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

export async function leerAjuste(clave) {
  const { data } = await supabaseServidor.from('settings').select('value').eq('key', clave).maybeSingle();
  return data?.value ?? null;
}

export async function cupoRevisiones() {
  // Sin ajuste guardado (o vacío) vale el de por defecto, no 0.
  const valor = await leerAjuste('review_quota');
  if (valor === null || String(valor).trim() === '') return CUPO_REVISIONES_DEFECTO;
  const n = Math.round(Number(valor));
  return Number.isFinite(n) && n >= 0 ? n : CUPO_REVISIONES_DEFECTO;
}

// Compras pagadas de una cuenta (sin contar la suscripción), para las insignias.
export async function comprasPagadas(userId) {
  const { count } = await supabaseServidor
    .from('purchases')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gt('amount', 0)
    .not('plan_name', 'ilike', 'Suscripci%');
  return count || 0;
}

export async function enviarCorreo(datos) {
  const clave = process.env.RESEND_API_KEY;
  if (!clave) {
    console.error('Falta RESEND_API_KEY: no se envía el correo', datos.subject);
    return false;
  }
  const { prepararCorreo } = await import('./correos');
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${clave}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(prepararCorreo(datos)),
  });
  if (!r.ok) console.error('Resend rechazó el correo', datos.subject, r.status);
  return r.ok;
}
