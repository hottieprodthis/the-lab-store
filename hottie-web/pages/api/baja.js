import { createClient } from '@supabase/supabase-js';
import { firmaBajaValida, normalizarEmail } from '../../lib/baja';

// Da de baja un email de los avisos de novedades: lo quita del boletín
// (tabla "suscriptores") y desactiva el aviso de su cuenta si la tiene
// (profiles.notify_new_items). Solo con un enlace firmado (lib/baja.js).
//
// Solo POST: así un programa que abra los enlaces del correo por su cuenta
// (antivirus, vistas previas) no da de baja a nadie sin querer. Lo llaman la
// página pages/baja.js y el botón de "Cancelar suscripción" de Gmail.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  // El email y la firma pueden venir en la dirección (Gmail) o en el cuerpo.
  const email = normalizarEmail(req.query.email || req.body?.email);
  const firma = req.query.t || req.body?.t;
  if (!firmaBajaValida(email, firma)) {
    return res.status(400).json({ error: 'El enlace de baja no es válido.' });
  }

  try {
    const { error: e1 } = await supabase.from('suscriptores').delete().eq('email', email);
    if (e1) throw new Error(e1.message);
    const { error: e2 } = await supabase.from('profiles').update({ notify_new_items: false }).eq('email', email);
    if (e2) throw new Error(e2.message);
    // Por si el perfil no tiene el email guardado: se busca la cuenta por email.
    const { data: idCuenta } = await supabase.rpc('get_user_id_by_email', { email_input: email });
    if (idCuenta) {
      const { error: e3 } = await supabase.from('profiles').update({ notify_new_items: false }).eq('id', idCuenta);
      if (e3) throw new Error(e3.message);
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Error en /api/baja:', err);
    return res.status(500).json({ error: 'No se pudo completar la baja. Inténtalo de nuevo.' });
  }
}
