import { createClient } from '@supabase/supabase-js';

// Usamos la Service Role Key para no depender de que exista (o no) una
// política RLS de UPDATE sobre "profiles" para el propio usuario — dados
// los problemas de RLS ya vistos en este proyecto (la tabla "suscriptores"
// bloqueaba lecturas sin avisar), es más fiable guardar esta preferencia
// desde el servidor con permisos completos.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Guarda la preferencia del cliente de recibir (o no) el mismo aviso de
// "nuevo producto/servicio/clase o cambio de precio" que reciben los
// suscritos al boletín público. Es una casilla propia del cliente
// (profiles.notify_new_items), independiente de is_subscribed (la
// suscripción de pago del área de clientes): un cliente puede querer este
// aviso sin pagar la suscripción, y al revés.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método no permitido' });
  }

  try {
    const { userId, notifyNewItems } = req.body || {};

    if (!userId) {
      return res.status(400).json({ error: 'Falta userId' });
    }

    const { error } = await supabase
      .from('profiles')
      .update({ notify_new_items: Boolean(notifyNewItems) })
      .eq('id', userId);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
