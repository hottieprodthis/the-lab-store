import { createClient } from '@supabase/supabase-js';
import { enviarCorreosIndividuales } from '../../../lib/correos';
import {
  enlaceOpinion,
  articuloDeCompra,
  esSuscripcion,
  DIAS_PEDIR_OPINION,
  DIAS_MAX_PEDIR_OPINION,
} from '../../../lib/opiniones';

// Correo pidiendo una opinión unos días después de cada compra (una sola vez
// por compra: purchases.opinion_pedida_en). Lo lanza Vercel una vez al día
// (vercel.json -> crons); con CRON_SECRET en Vercel solo se acepta su llamada.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const DIA = 24 * 60 * 60 * 1000;
const escapar = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export default async function handler(req, res) {
  const secreto = process.env.CRON_SECRET;
  if (secreto && req.headers.authorization !== `Bearer ${secreto}`) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  const ahora = Date.now();
  const { data: compras, error } = await supabase
    .from('purchases')
    .select('id, user_id, email, plan_name, items, created_at')
    .is('opinion_pedida_en', null)
    .lte('created_at', new Date(ahora - DIAS_PEDIR_OPINION * DIA).toISOString())
    .gte('created_at', new Date(ahora - DIAS_MAX_PEDIR_OPINION * DIA).toISOString())
    .limit(200);
  if (error) {
    console.error('pedir-opinion: no se pudieron leer las compras', error.message);
    return res.status(500).json({ error: 'No se pudieron leer las compras' });
  }

  const candidatas = (compras || []).filter((c) => !esSuscripcion(c));
  if (candidatas.length === 0) return res.status(200).json({ ok: true, pedidas: 0 });

  // Email de cada compra: el guardado en la compra o, si no, el de su cuenta.
  const sinEmail = [...new Set(candidatas.filter((c) => !c.email && c.user_id).map((c) => c.user_id))];
  const emails = {};
  if (sinEmail.length) {
    const { data: perfiles } = await supabase.from('profiles').select('id, email').in('id', sinEmail);
    for (const p of perfiles || []) emails[p.id] = p.email;
  }

  // Una persona con varias compras el mismo día recibe un solo correo.
  const porEmail = new Map();
  for (const c of candidatas) {
    const email = String(c.email || emails[c.user_id] || '').trim().toLowerCase();
    if (!email) continue;
    if (!porEmail.has(email)) porEmail.set(email, c);
  }

  const correos = [...porEmail.entries()].map(([email, c]) => ({
    from: 'The Lab <pedidos@hottieprodthis.com>',
    to: [email],
    subject: '¿Qué tal tu experiencia con The Lab?',
    html: `
      <div style="background-color:#0d0d0d; color:#ffffff; font-family: Arial, sans-serif; padding:30px;">
        <p style="color:#CCFF00; font-weight:bold; letter-spacing:2px; font-size:12px;">THE LAB — HOTTIE</p>
        <h2 style="color:#ffffff;">¿Qué tal fue?</h2>
        <p style="color:#dddddd;">Hace unos días compraste <strong>${escapar(articuloDeCompra(c))}</strong>. Nos encantaría saber qué te pareció: tu opinión ayuda a otros artistas a decidirse y a nosotros a mejorar.</p>
        <p style="color:#dddddd;">Solo te llevará un minuto.</p>
        <div style="margin-top:24px;">
          <a href="${enlaceOpinion(c.id)}" style="background-color:#CCFF00; color:#000000; padding:14px 28px; text-decoration:none; font-weight:900; border-radius:4px; display:inline-block; text-transform:uppercase;">Dejar mi opinión ★★★★★</a>
        </div>
        <p style="color:#888888; font-size:12px; margin-top:24px;">Solo se publicarán tu nombre, las estrellas y lo que escribas; nunca tu email. Si no te apetece, ignora este correo: no te lo volveremos a pedir.</p>
      </div>
    `,
  }));

  let pedidas = 0;
  if (correos.length) {
    try {
      pedidas = await enviarCorreosIndividuales(correos);
    } catch (e) {
      console.error('pedir-opinion: error enviando correos:', e.message);
      return res.status(502).json({ error: 'No se pudieron enviar los correos' });
    }
  }

  // Se marcan todas (también las sin email o repetidas) para no volver a pedir.
  const ids = candidatas.map((c) => c.id);
  await supabase.from('purchases').update({ opinion_pedida_en: new Date().toISOString() }).in('id', ids);

  return res.status(200).json({ ok: true, pedidas });
}
