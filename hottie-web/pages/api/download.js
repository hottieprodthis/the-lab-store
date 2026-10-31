import { suscripcionActiva } from '../../lib/suscripcion';
import { enlaceFirmadoR2 } from '../../lib/descargas';
import { supabaseServidor as supabase, usuarioDePeticion } from '../../lib/servidorArea';

// Descarga de un pack exclusivo del área de clientes.
//
// Antes esta ruta firmaba CUALQUIER archivo del almacenamiento (R2) para
// cualquiera que supiera su nombre, sin comprobar nada: los packs exclusivos
// se podían bajar gratis. Ahora solo da el enlace a un suscriptor activo (o al
// admin), y solo de un pack que exista. Si el pack tiene un enlace normal
// (https://...), se devuelve tal cual; si es un archivo de R2, un enlace
// firmado que caduca en 10 minutos.
//
// POST { packId } con la sesión del cliente (Authorization: Bearer ...).
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido' });
  }
  res.setHeader('Cache-Control', 'no-store');
  try {
    const usuario = await usuarioDePeticion(req);
    if (!usuario) return res.status(401).json({ error: 'Tienes que iniciar sesión.' });
    const { data: perfil } = await supabase
      .from('profiles')
      .select('is_admin, is_subscribed, subscribed_until')
      .eq('id', usuario.id)
      .maybeSingle();
    if (!suscripcionActiva(perfil)) return res.status(403).json({ error: 'Los packs son para suscriptores.' });

    const { data: pack } = await supabase.from('packs').select('file_key').eq('id', String(req.body?.packId || '')).maybeSingle();
    const clave = String(pack?.file_key || '').trim();
    if (!clave) return res.status(404).json({ error: 'Este pack no tiene archivo todavía.' });

    const url = /^https:\/\//i.test(clave) ? clave : await enlaceFirmadoR2(clave, 600);
    if (!url) return res.status(500).json({ error: 'No se pudo preparar la descarga.' });
    return res.status(200).json({ url });
  } catch (error) {
    console.error('Error al preparar la descarga del pack:', error);
    return res.status(500).json({ error: 'Error al procesar la descarga' });
  }
}
