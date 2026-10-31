import { suscripcionActiva } from '../../../lib/suscripcion';
import { supabaseServidor as supabase, usuarioDePeticion } from '../../../lib/servidorArea';

// Voto de un suscriptor en la votación abierta. Un voto por persona (se
// puede cambiar mientras siga abierta).
// POST { votacionId, opcion } con la sesión del cliente.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido' });
  }
  try {
    const usuario = await usuarioDePeticion(req);
    if (!usuario) return res.status(401).json({ error: 'Tienes que iniciar sesión.' });
    const { data: perfil } = await supabase
      .from('profiles')
      .select('is_admin, is_subscribed, subscribed_until')
      .eq('id', usuario.id)
      .maybeSingle();
    if (!suscripcionActiva(perfil)) return res.status(403).json({ error: 'Las votaciones son para suscriptores.' });

    const { votacionId, opcion } = req.body || {};
    const { data: votacion } = await supabase
      .from('votaciones')
      .select('id, opciones, abierta')
      .eq('id', String(votacionId || ''))
      .maybeSingle();
    if (!votacion || !votacion.abierta) return res.status(404).json({ error: 'Esta votación ya está cerrada.' });
    const n = Number(opcion);
    const total = Array.isArray(votacion.opciones) ? votacion.opciones.length : 0;
    if (!Number.isInteger(n) || n < 0 || n >= total) return res.status(400).json({ error: 'Elige una opción.' });

    const { error } = await supabase
      .from('votos')
      .upsert({ votacion_id: votacion.id, user_id: usuario.id, opcion: n, created_at: new Date().toISOString() }, { onConflict: 'votacion_id,user_id' });
    if (error) throw error;
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('api/area/votar:', e);
    return res.status(500).json({ error: 'No se pudo guardar tu voto.' });
  }
}
