import { createClient } from '@supabase/supabase-js';

// Botón "Eliminar del historial" del área de clientes.
//
// La compra desaparece del perfil del cliente (deja de estar unida a su
// cuenta), pero NO se borra: se queda guardada como compra sin cuenta
// (user_id vacío + su email), igual que las de gente que compra sin cuenta.
// Así sigue gastando cupo y saliendo en las estadísticas del admin, que puede
// borrarla del todo desde allí.
//
// POST { compraId } con la sesión del cliente (Authorization: Bearer <token>).
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return res.status(401).json({ error: 'Tienes que iniciar sesión.' });
    }

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    const usuario = userData?.user;
    if (userError || !usuario) {
      return res.status(401).json({ error: 'Tu sesión ha caducado. Vuelve a iniciar sesión.' });
    }

    const { compraId } = req.body || {};
    // El id de las compras es un número en la base de datos (purchases.id).
    if ((typeof compraId !== 'string' && typeof compraId !== 'number') || compraId === '') {
      return res.status(400).json({ error: 'Falta la compra.' });
    }

    const { data: compra, error } = await supabase
      .from('purchases')
      .select('id, user_id')
      .eq('id', compraId)
      .single();

    // Solo el dueño de la compra puede quitarla de su historial. Si no es
    // suya (o no existe) se responde lo mismo, sin dar pistas.
    if (error || !compra || compra.user_id !== usuario.id) {
      return res.status(404).json({ error: 'No se ha encontrado esa compra en tu historial.' });
    }

    const { error: updError } = await supabase
      .from('purchases')
      .update({ user_id: null, email: usuario.email || null })
      .eq('id', compra.id)
      .eq('user_id', usuario.id);

    if (updError) {
      console.error('quitar-de-historial: error de Supabase:', updError.message);
      return res.status(500).json({ error: 'No se pudo eliminar. Inténtalo de nuevo.' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Error en /api/quitar-de-historial:', err);
    return res.status(500).json({ error: 'No se pudo eliminar. Inténtalo de nuevo.' });
  }
}
