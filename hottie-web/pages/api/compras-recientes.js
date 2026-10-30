import { createClient } from '@supabase/supabase-js';
import { leerObras } from '../../lib/obras';

// Compras REALES del último año para los avisos de la web
// (components/AvisoCompras.js). Solo devuelve el nombre de pila de quien lo
// aceptó al pagar (si no, nada: sale como "Alguien"), el país y lo que
// compró. Nunca ids, correos, importes ni fechas. Sin compras pagadas
// recientes, la lista va vacía y no sale ningún aviso.
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');

const DIAS = 365;
const MAXIMO = 60; // el navegador las baraja y enseña solo unas pocas

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  try {
    // Con la web cerrada (obras, solo portada, compras cerradas) no se anima a comprar.
    if (await leerObras(supabase)) return res.status(200).json({ compras: [] });

    const desde = new Date(Date.now() - DIAS * 86400000).toISOString();
    const { data } = await supabase
      .from('purchases')
      .select('items, plan_name, aviso, amount')
      .gte('created_at', desde)
      .gt('amount', 0)
      .not('plan_name', 'ilike', 'Suscripci%')
      .order('created_at', { ascending: false })
      .limit(MAXIMO);

    const compras = (data || []).map((c) => {
      const item = Array.isArray(c.items) && c.items.length ? c.items[0] : null;
      return {
        nombre: c.aviso?.nombre || null,
        pais: c.aviso?.pais || null,
        articulo: item?.name || c.plan_name || '',
        imagen: item?.image_url || null,
        tipo: item?.type || 'producto', // producto | servicio | clase (para el icono si no hay imagen)
      };
    }).filter((c) => c.articulo);

    return res.status(200).json({ compras });
  } catch (e) {
    return res.status(200).json({ compras: [] });
  }
}
