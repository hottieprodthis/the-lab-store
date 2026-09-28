import { createClient } from '@supabase/supabase-js';

// OJO: este endpoint es server-side (pages/api), así que necesita la
// Service Role Key y NO el cliente compartido de lib/supabaseClient.js
// (ese usa la clave "anon", pensada para el navegador). La tabla
// "suscriptores" tiene RLS activado sin política de lectura pública (solo
// se permite insertar desde el formulario de la home), así que con la
// clave "anon" esta consulta siempre devolvía 0 filas sin ningún error
// visible: por eso nunca llegaba ningún aviso aunque sí hubiera
// suscriptores guardados. Con la Service Role Key se salta RLS y lee la
// lista real.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método no permitido' });
  }

  try {
    const payload = req.body.record || req.body;
    
    // Capturar el nombre tolerando las columnas de productos o servicios
    const titulo = payload.title || payload.name || payload.nombre || 'Nuevo Lanzamiento';
    const descripcion = payload.description || payload.descripcion || '';
    const precio = payload.price || payload.precio || null;
    const tipoRaw = payload.type || payload.tipo || '';
    // Antes esto solo distinguía "servicio" (todo lo demás se etiquetaba
    // como "PRODUCTO", así que una clase nueva se anunciaba mal). Ahora
    // distingue las tres categorías reales del catálogo.
    const tipoEtiqueta = tipoRaw === 'servicio' ? 'SERVICIO' : tipoRaw === 'clase' ? 'CLASE' : 'PRODUCTO';
    // Permite reutilizar este mismo endpoint para avisar de una bajada/
    // subida de precio en un producto/servicio/clase ya publicado, sin
    // crear un endpoint ni una tabla nueva para ello.
    const esCambioPrecio = payload.motivo === 'cambio_precio';

    // Enlace directo a la página principal / inicio
    const enlace = 'https://hottieprodthis.com';

    // 1. Suscriptores del boletín público (tabla "suscriptores": visitantes
    // que dejaron su email en la home, sin necesidad de tener cuenta).
    const { data: suscriptores, error } = await supabase
      .from('suscriptores')
      .select('email');

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // 2. Clientes del área de clientes que han activado, desde sus propios
    // Ajustes, el aviso de "nuevo producto/servicio/clase o cambio de
    // precio" (columna profiles.notify_new_items). Es una casilla aparte
    // de is_subscribed: un cliente puede querer este aviso aunque no pague
    // la suscripción del área de clientes, y viceversa.
    const { data: perfilesConAviso, error: errorPerfiles } = await supabase
      .from('profiles')
      .select('id')
      .eq('notify_new_items', true);

    if (errorPerfiles) {
      console.error('No se pudo consultar profiles.notify_new_items:', errorPerfiles.message);
    }

    const emailsClientes = [];
    if (perfilesConAviso && perfilesConAviso.length > 0) {
      for (const perfil of perfilesConAviso) {
        try {
          const { data } = await supabase.auth.admin.getUserById(perfil.id);
          if (data?.user?.email) emailsClientes.push(data.user.email);
        } catch (e) {
          console.error('No se pudo obtener el email del perfil', perfil.id, e.message);
        }
      }
    }

    // Unimos las dos listas sin duplicados (un cliente podría estar también
    // apuntado al boletín público con el mismo correo).
    const listaEmails = Array.from(
      new Set([...(suscriptores || []).map((s) => s.email), ...emailsClientes].filter(Boolean))
    );

    if (listaEmails.length === 0) {
      return res.status(200).json({ message: 'No hay destinatarios: ni suscriptores del boletín ni clientes con el aviso activado' });
    }

    const resendApiKey = process.env.RESEND_API_KEY;

    if (!resendApiKey) {
      return res.status(500).json({ error: 'Falta RESEND_API_KEY en Vercel' });
    }

    // 2. Enviar el e-mail a la lista
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'The Lab <pedidos@hottieprodthis.com>',
        to: listaEmails,
        subject: esCambioPrecio
          ? `💸 NUEVO PRECIO EN ${tipoEtiqueta}: ${titulo}`
          : `🔥 NUEVO ${tipoEtiqueta}: ${titulo}`,
        html: `
          <div style="background-color:#0d0d0d; color:#ffffff; font-family: Arial, sans-serif; padding:30px; text-align:center;">
            <p style="color:#CCFF00; font-weight:bold; letter-spacing:2px; font-size:12px; margin-bottom:10px;">THE LAB — NOTIFICACIONES</p>
            <h1 style="color:#ffffff; margin-top:0;">${esCambioPrecio ? '¡PRECIO ACTUALIZADO!' : '¡NUEVO LANZAMIENTO!'}</h1>
            <h2 style="color:#CCFF00; font-size:24px;">${titulo}</h2>
            ${descripcion ? `<p style="color:#cccccc; font-size:15px; max-width:500px; margin:20px auto;">${descripcion}</p>` : ''}
            ${precio ? `<p style="font-size:22px; font-weight:bold; color:#ffffff; margin:15px 0;">Precio: ${precio}€</p>` : ''}
            <div style="margin-top:30px;">
              <a href="${enlace}" target="_blank" style="background-color:#CCFF00; color:#000000; padding:14px 28px; text-decoration:none; font-weight:900; border-radius:4px; display:inline-block; text-transform:uppercase;">
                VER EN LA WEB
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

    return res.status(200).json({ success: true, enviados: listaEmails.length, resendData });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
