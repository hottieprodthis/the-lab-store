import { createClient } from '@supabase/supabase-js';
import { firmaOpinionValida, articuloDeCompra, esSuscripcion, enlaceOpinion } from '../../lib/opiniones';
import { enviarCorreosIndividuales } from '../../lib/correos';

// Opiniones de clientes (lib/opiniones.js).
//
//   GET  ?c=ID&t=FIRMA            -> { articulo, yaOpinada } para la página /opinion
//   POST { c, t, nombre, texto, estrellas } -> guarda la opinión (pendiente de aprobar)
//   POST { accion: 'enlace', compraId } + sesión de cliente
//                                 -> { url } enlace personal (botón del área de cliente)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function compraValida(c, t) {
  if (!firmaOpinionValida(c, t)) return null;
  const { data } = await supabase.from('purchases').select('id, plan_name, items').eq('id', Number(c)).maybeSingle();
  if (!data || esSuscripcion(data)) return null;
  return data;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method === 'GET') {
      const compra = await compraValida(req.query.c, req.query.t);
      if (!compra) return res.status(400).json({ error: 'El enlace no es válido.' });
      const { data: ya } = await supabase.from('opiniones').select('id').eq('purchase_id', compra.id).maybeSingle();
      return res.status(200).json({ articulo: articuloDeCompra(compra), yaOpinada: Boolean(ya) });
    }

    if (req.method !== 'POST') {
      res.setHeader('Allow', 'GET, POST');
      return res.status(405).json({ error: 'Método no permitido' });
    }

    // Enlace para el botón "Dejar opinión" del área de cliente (solo sus compras).
    if (req.body?.accion === 'enlace') {
      const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
      const { data: u } = token ? await supabase.auth.getUser(token) : { data: null };
      if (!u?.user) return res.status(401).json({ error: 'Inicia sesión.' });
      const { data: compra } = await supabase
        .from('purchases')
        .select('id, user_id, plan_name')
        .eq('id', Number(req.body.compraId))
        .maybeSingle();
      if (!compra || compra.user_id !== u.user.id || esSuscripcion(compra)) {
        return res.status(404).json({ error: 'No se encuentra esa compra.' });
      }
      return res.status(200).json({ url: enlaceOpinion(compra.id) });
    }

    const { c, t } = req.body || {};
    const compra = await compraValida(c, t);
    if (!compra) return res.status(400).json({ error: 'El enlace no es válido.' });

    const nombre = String(req.body.nombre || '').trim().slice(0, 60);
    const texto = String(req.body.texto || '').trim().slice(0, 1000);
    const estrellas = Math.round(Number(req.body.estrellas));
    if (!nombre) return res.status(400).json({ error: 'Escribe tu nombre o nombre artístico.' });
    if (texto.length < 10) return res.status(400).json({ error: 'Cuéntanos un poco más (mínimo 10 caracteres).' });
    if (!(estrellas >= 1 && estrellas <= 5)) return res.status(400).json({ error: 'Elige de 1 a 5 estrellas.' });

    const articulo = articuloDeCompra(compra);
    const { error } = await supabase
      .from('opiniones')
      .insert([{ purchase_id: compra.id, nombre, texto, estrellas, articulo }]);
    if (error) {
      if (String(error.code) === '23505') return res.status(409).json({ error: 'Ya dejaste tu opinión sobre esta compra. ¡Gracias!' });
      throw new Error(error.message);
    }

    // Aviso al dueño para que la apruebe (si falla, la opinión queda guardada igual).
    try {
      await enviarCorreosIndividuales([
        {
          from: 'The Lab <pedidos@hottieprodthis.com>',
          to: ['pedidos.thelab@gmail.com'],
          subject: `⭐ Nueva opinión (${estrellas}/5) pendiente de aprobar`,
          html: `<div style="font-family:Arial,sans-serif"><p><strong>${nombre.replace(/</g, '&lt;')}</strong> ha dejado ${estrellas} estrellas sobre «${articulo.replace(/</g, '&lt;')}»:</p><blockquote>${texto.replace(/</g, '&lt;')}</blockquote><p>Apruébala (o no) desde el panel de admin, apartado Opiniones.</p></div>`,
        },
      ]);
    } catch (e) {
      console.error('opinion: no se pudo avisar al admin', e.message);
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Error en /api/opinion:', err);
    return res.status(500).json({ error: 'No se pudo guardar. Inténtalo de nuevo.' });
  }
}
