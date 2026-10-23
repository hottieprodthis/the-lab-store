import { createClient } from '@supabase/supabase-js';
import { normalizarEmail, enlaceConfirmacion, firmaConfirmacionValida } from '../../lib/baja';
import { enviarCorreosIndividuales } from '../../lib/correos';

// Boletín de novedades de la portada, con doble confirmación:
//
//   POST { email, web }            -> alta pendiente + correo con botón "Confirmar"
//   POST { accion: 'confirmar', email, t } -> la confirma (desde pages/boletin/confirmar.js)
//
// Solo reciben las novedades los emails confirmados (suscriptores.confirmado),
// así nadie puede apuntar el email de otra persona.
// "web" es un campo invisible del formulario: las personas no lo ven y lo
// dejan vacío; los bots lo rellenan, y entonces se les responde "ok" sin
// guardar nada.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const MINUTOS_ENTRE_CORREOS = 10;
const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { accion, web, t } = req.body || {};
  const email = normalizarEmail(req.body?.email);

  try {
    // ------------------------------------------------------------ confirmar
    if (accion === 'confirmar') {
      if (!firmaConfirmacionValida(email, t)) {
        return res.status(400).json({ error: 'El enlace de confirmación no es válido.' });
      }
      const { data: fila } = await supabase.from('suscriptores').select('id').eq('email', email).maybeSingle();
      const ahora = new Date().toISOString();
      const { error } = fila
        ? await supabase.from('suscriptores').update({ confirmado: true, confirmado_en: ahora }).eq('id', fila.id)
        : await supabase.from('suscriptores').insert([{ email, confirmado: true, confirmado_en: ahora }]);
      if (error) throw new Error(error.message);
      return res.status(200).json({ ok: true });
    }

    // ----------------------------------------------------------------- alta
    if (web) {
      // Bot: se le dice que todo ha ido bien, pero no se guarda nada.
      return res.status(200).json({ ok: true });
    }
    if (!EMAIL_VALIDO.test(email) || email.length > 254) {
      return res.status(400).json({ error: 'Escribe un email válido.' });
    }

    const { data: fila } = await supabase
      .from('suscriptores')
      .select('id, confirmado, created_at')
      .eq('email', email)
      .maybeSingle();

    // Siempre la misma respuesta, para no desvelar quién está apuntado.
    const respuesta = { ok: true };
    if (fila?.confirmado) return res.status(200).json(respuesta);

    // No reenviar el correo de confirmación si se pidió hace muy poco
    // (evita que alguien llene de correos la bandeja de otra persona).
    if (fila && Date.now() - new Date(fila.created_at).getTime() < MINUTOS_ENTRE_CORREOS * 60000) {
      return res.status(200).json(respuesta);
    }

    const ahora = new Date().toISOString();
    const { error } = fila
      ? await supabase.from('suscriptores').update({ created_at: ahora }).eq('id', fila.id)
      : await supabase.from('suscriptores').insert([{ email, confirmado: false, created_at: ahora }]);
    if (error) throw new Error(error.message);

    await enviarCorreosIndividuales([
      {
        from: 'The Lab <pedidos@hottieprodthis.com>',
        to: [email],
        subject: 'Un último paso para recibir las novedades de The Lab',
        // Texto cercano y explicando por qué le llega: los correos de
        // "confirma" muy escuetos se parecen a los de estafas y van a spam.
        html: `
          <div style="background-color:#0d0d0d; color:#ffffff; font-family: Arial, sans-serif; padding:30px; text-align:center;">
            <p style="color:#CCFF00; font-weight:bold; letter-spacing:2px; font-size:12px;">THE LAB — HOTTIE</p>
            <h2 style="color:#ffffff;">¡Hola! Gracias por apuntarte</h2>
            <p style="color:#dddddd;">Alguien (seguramente tú) ha escrito este email en el formulario de novedades de <a href="https://hottieprodthis.com" style="color:#CCFF00;">hottieprodthis.com</a>, la web de producción musical de Hottie.</p>
            <p style="color:#dddddd;">Para empezar a recibir los avisos de nuevos kits, servicios, clases y cambios de precio, confirma tu email:</p>
            <div style="margin-top:24px;">
              <a href="${enlaceConfirmacion(email)}" style="background-color:#CCFF00; color:#000000; padding:14px 28px; text-decoration:none; font-weight:900; border-radius:4px; display:inline-block; text-transform:uppercase;">Confirmar mi email</a>
            </div>
            <p style="color:#888888; font-size:12px; margin-top:24px;">Si no has sido tú, ignora este correo: no recibirás nada más. Si tienes cualquier duda, responde a este correo.</p>
          </div>
        `,
      },
    ]);

    return res.status(200).json(respuesta);
  } catch (err) {
    console.error('Error en /api/boletin:', err);
    return res.status(500).json({ error: 'No se pudo completar. Inténtalo de nuevo.' });
  }
}
