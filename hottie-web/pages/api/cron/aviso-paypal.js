import { createClient } from '@supabase/supabase-js';
import { enviarCorreosIndividuales } from '../../../lib/correos';

// Aviso por correo a quien pagó la suscripción con PayPal (no se renueva sola)
// cuando le quedan 3 días o menos para que se le acabe el mes, con un botón
// para renovar desde su área de clientes. Se avisa una sola vez por cada mes
// pagado (profiles.aviso_caducidad_para).
//
// Lo lanza Vercel una vez al día (vercel.json -> crons). Si en Vercel existe
// la variable CRON_SECRET, solo se acepta la llamada que la trae; si no, se
// acepta igual (como mucho manda los avisos que tocaban, nunca repetidos).
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const DIAS_ANTES = 3;

const formatoFecha = (d) =>
  new Date(d).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Madrid' });

export default async function handler(req, res) {
  const secreto = process.env.CRON_SECRET;
  if (secreto && req.headers.authorization !== `Bearer ${secreto}`) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  const ahora = new Date();
  const limite = new Date(ahora.getTime() + DIAS_ANTES * 24 * 60 * 60 * 1000);

  const { data: perfiles, error } = await supabase
    .from('profiles')
    .select('id, email, subscribed_until, aviso_caducidad_para')
    .eq('is_subscribed', true)
    .is('stripe_subscription_id', null)
    .gt('subscribed_until', ahora.toISOString())
    .lte('subscribed_until', limite.toISOString());

  if (error) {
    console.error('aviso-paypal: no se pudieron leer los perfiles', error.message);
    return res.status(500).json({ error: 'No se pudieron leer los perfiles' });
  }

  const pendientes = (perfiles || []).filter(
    (p) =>
      p.email &&
      (!p.aviso_caducidad_para || new Date(p.aviso_caducidad_para).getTime() !== new Date(p.subscribed_until).getTime())
  );

  if (pendientes.length === 0) return res.status(200).json({ ok: true, avisados: 0 });

  const correos = pendientes.map((p) => ({
    from: 'The Lab <pedidos@hottieprodthis.com>',
    to: [p.email],
    subject: 'Tu suscripción a The Lab termina pronto',
    html: `
      <div style="background-color:#0d0d0d; color:#ffffff; font-family: Arial, sans-serif; padding:30px;">
        <p style="color:#CCFF00; font-weight:bold; letter-spacing:2px; font-size:12px;">THE LAB — ÁREA DE CLIENTES</p>
        <h2 style="color:#ffffff;">Tu mes de suscripción está a punto de acabar</h2>
        <p style="color:#dddddd;">Pagaste tu suscripción con PayPal, que no se renueva sola. Tu acceso al contenido exclusivo termina el <strong style="color:#CCFF00;">${formatoFecha(p.subscribed_until)}</strong>.</p>
        <p style="color:#dddddd;">Si quieres seguir, puedes renovar otro mes desde tu área de clientes en un momento. Si no, no tienes que hacer nada: simplemente terminará ese día.</p>
        <div style="margin-top:24px;">
          <a href="https://hottieprodthis.com/area-cliente" style="background-color:#CCFF00; color:#000000; padding:14px 28px; text-decoration:none; font-weight:900; border-radius:4px; display:inline-block; text-transform:uppercase;">Renovar mi suscripción</a>
        </div>
        <p style="color:#888888; font-size:12px; margin-top:24px;">Si prefieres que se renueve sola cada mes, al renovar elige pagar con tarjeta.</p>
      </div>
    `,
  }));

  let avisados = 0;
  try {
    avisados = await enviarCorreosIndividuales(correos);
  } catch (e) {
    console.error('aviso-paypal: error enviando avisos:', e.message);
    return res.status(502).json({ error: 'No se pudieron enviar los avisos' });
  }

  // Se apunta para no repetir el aviso de este mismo mes.
  for (const p of pendientes) {
    await supabase.from('profiles').update({ aviso_caducidad_para: p.subscribed_until }).eq('id', p.id);
  }

  return res.status(200).json({ ok: true, avisados });
}
