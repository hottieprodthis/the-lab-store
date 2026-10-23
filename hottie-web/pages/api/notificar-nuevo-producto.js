import { createClient } from '@supabase/supabase-js';
import { enviarCorreosIndividuales } from '../../lib/correos';
import { enlaceBaja, cabecerasBaja } from '../../lib/baja';

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

// Los textos van dentro del HTML del correo: se escapan para que no se pueda
// colar código ni enlaces en él.
function escaparHtml(texto) {
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método no permitido' });
  }

  try {
    // Envía correos a toda la lista, así que solo responde a una sesión de
    // admin (profiles.is_admin = true), igual que /api/admin/estadisticas.
    // Lo llama components/ItemForm.js con la sesión del panel.
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return res.status(401).json({ error: 'No autorizado: falta la sesión de admin.' });
    }
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return res.status(401).json({ error: 'No autorizado: la sesión de admin no es válida o ha caducado.' });
    }
    const { data: perfil } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', userData.user.id)
      .single();
    if (!perfil?.is_admin) {
      return res.status(403).json({ error: 'Esta cuenta no tiene permisos de administrador (profiles.is_admin).' });
    }

    const payload = req.body.record || req.body;

    // Capturar el nombre tolerando las columnas de productos o servicios
    // El asunto es texto plano (no HTML): ahí va el nombre tal cual.
    const tituloAsunto = String(payload.title || payload.name || payload.nombre || 'Nuevo Lanzamiento');
    const titulo = escaparHtml(tituloAsunto);
    const descripcion = escaparHtml(payload.description || payload.descripcion || '');
    const precio = payload.price || payload.precio ? escaparHtml(payload.price || payload.precio) : null;
    const tipoRaw = payload.type || payload.tipo || '';
    // Antes esto solo distinguía "servicio" (todo lo demás se etiquetaba
    // como "PRODUCTO", así que una clase nueva se anunciaba mal). Ahora
    // distingue las tres categorías reales del catálogo.
    const tipoEtiqueta = tipoRaw === 'servicio' ? 'SERVICIO' : tipoRaw === 'clase' ? 'CLASE' : 'PRODUCTO';
    // Permite reutilizar este mismo endpoint para avisar de una bajada/
    // subida de precio en un producto/servicio/clase ya publicado, sin
    // crear un endpoint ni una tabla nueva para ello.
    const esCambioPrecio = payload.motivo === 'cambio_precio';

    // Enlace a la ficha del producto/servicio/clase. Solo se acepta un slug
    // normal (letras, números y guiones, como los que genera el admin); si no
    // llega o no lo es, el botón lleva a la portada como antes.
    const seccion = tipoRaw === 'servicio' ? 'servicios' : tipoRaw === 'clase' ? 'clases' : 'tienda';
    const slug = typeof payload.slug === 'string' && /^[a-z0-9-]+$/.test(payload.slug) ? payload.slug : '';
    const enlace = slug ? `https://hottieprodthis.com/${seccion}/${slug}` : 'https://hottieprodthis.com';

    // 1. Suscriptores del boletín público (tabla "suscriptores": visitantes
    // que dejaron su email en la home, sin necesidad de tener cuenta).
    const { data: suscriptores, error } = await supabase
      .from('suscriptores')
      .select('email')
      // Solo quien ha confirmado su email (pages/api/boletin.js).
      .eq('confirmado', true);

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

    // 2. Enviar el e-mail a la lista: uno por persona (lib/correos.js), para
    // que nadie vea los emails de los demás. Antes iban todos en el mismo
    // "Para:".
    const correo = {
        from: 'The Lab <pedidos@hottieprodthis.com>',
        subject: esCambioPrecio
          ? `💸 NUEVO PRECIO EN ${tipoEtiqueta}: ${tituloAsunto}`
          : `🔥 ${tipoEtiqueta === 'CLASE' ? 'NUEVA' : 'NUEVO'} ${tipoEtiqueta}: ${tituloAsunto}`,
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
    };

    // Cada correo lleva su propio enlace de "Darme de baja" (lib/baja.js).
    const enviados = await enviarCorreosIndividuales(
      listaEmails.map((email) => ({
        ...correo,
        to: [email],
        headers: cabecerasBaja(email),
        html: `${correo.html}
          <p style="font-family: Arial, sans-serif; font-size:12px; color:#888888; text-align:center; margin-top:20px;">
            Recibes este correo porque te apuntaste a las novedades de The Lab.
            <a href="${enlaceBaja(email)}" style="color:#888888; text-decoration:underline;">Darme de baja</a>
          </p>`,
      }))
    );

    return res.status(200).json({ success: true, enviados });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
