import { createClient } from '@supabase/supabase-js';

// Usamos la Service Role Key porque necesitamos leer el email real de cada
// cuenta con auth.admin.getUserById (la tabla "profiles" no guarda el
// email, solo el id y el estado de suscripción).
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Avisa a los CLIENTES con la suscripción del área de clientes activa
// (profiles.is_subscribed = true) de que hay contenido nuevo: un post
// exclusivo o un pack/kit de descarga. Esta es una audiencia DISTINTA del
// newsletter público (tabla "suscriptores"): son cuentas de pago, no
// visitantes que dejaron su email en la home. No se crea ninguna tabla
// nueva ni sistema paralelo: solo se reutiliza "profiles" tal cual ya
// existe.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método no permitido' });
  }

  try {
    const { tipo, titulo, descripcion } = req.body || {};
    const esPost = tipo === 'post';
    const etiqueta = esPost ? 'POST EXCLUSIVO' : 'PACK / KIT';

    const { data: perfiles, error: perfilesError } = await supabase
      .from('profiles')
      .select('id')
      .eq('is_subscribed', true);

    if (perfilesError) {
      return res.status(500).json({ error: perfilesError.message });
    }

    if (!perfiles || perfiles.length === 0) {
      return res.status(200).json({ message: 'No hay clientes con suscripción activa todavía' });
    }

    // Resolvemos el email real de cada cliente suscrito uno por uno (no
    // hay muchos suscritos a la vez normalmente, así que esto es rápido).
    const emails = [];
    for (const perfil of perfiles) {
      try {
        const { data } = await supabase.auth.admin.getUserById(perfil.id);
        if (data?.user?.email) emails.push(data.user.email);
      } catch (e) {
        console.error('No se pudo obtener el email del perfil', perfil.id, e.message);
      }
    }

    if (emails.length === 0) {
      return res.status(200).json({ message: 'No se pudo resolver el email de ningún cliente suscrito' });
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      return res.status(500).json({ error: 'Falta RESEND_API_KEY en Vercel' });
    }

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'The Lab <pedidos@hottieprodthis.com>',
        to: emails,
        subject: `🔥 NUEVO ${etiqueta} EN TU ÁREA DE CLIENTES: ${titulo}`,
        html: `
          <div style="background-color:#0d0d0d; color:#ffffff; font-family: Arial, sans-serif; padding:30px; text-align:center;">
            <p style="color:#CCFF00; font-weight:bold; letter-spacing:2px; font-size:12px; margin-bottom:10px;">THE LAB — ÁREA DE CLIENTES</p>
            <h1 style="color:#ffffff; margin-top:0;">¡NUEVO ${etiqueta}!</h1>
            <h2 style="color:#CCFF00; font-size:24px;">${titulo}</h2>
            ${descripcion ? `<p style="color:#cccccc; font-size:15px; max-width:500px; margin:20px auto;">${descripcion}</p>` : ''}
            <div style="margin-top:30px;">
              <a href="https://hottieprodthis.com/area-cliente" target="_blank" style="background-color:#CCFF00; color:#000000; padding:14px 28px; text-decoration:none; font-weight:900; border-radius:4px; display:inline-block; text-transform:uppercase;">
                VER EN MI ÁREA DE CLIENTES
              </a>
            </div>
          </div>
        `,
      }),
    });

    const resendData = await resendResponse.json();
    if (!resendResponse.ok) {
      return res.status(500).json({ error: resendData });
    }

    return res.status(200).json({ success: true, enviados: emails.length });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
