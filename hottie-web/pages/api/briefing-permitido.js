import { createClient } from '@supabase/supabase-js';
import { referenciaPago, comprobarPagoBriefing } from '../../lib/pagoBriefing';

// ¿Puede abrirse el formulario de después de pagar? (lib/pagoBriefing.js)
// GET ?session_id=... | ?paypal=... | ?compra=...  ->  { ok, servicio, clase }
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Método no permitido' });
  }
  res.setHeader('Cache-Control', 'no-store');
  const resultado = await comprobarPagoBriefing(supabase, referenciaPago(req.query));
  return res.status(200).json(resultado);
}
