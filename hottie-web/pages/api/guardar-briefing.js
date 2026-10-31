import { prepararCorreo } from '../../lib/correos';
import { createClient } from '@supabase/supabase-js';
import { comprobarEnlace, comprobarEnlaces, enlaceParaCorreo, escaparHtml } from '../../lib/enlacesSeguros';
import { referenciaPago, comprobarPagoBriefing } from '../../lib/pagoBriefing';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método no permitido' });
  }

  const {
    nombre,
    email,
    telefono,
    estilo,
    enlaceDemo,
    tieneStems,
    detalles,
    nivel,
    tipo,
    modalidad,
    enlacesProyectos,
    plugins,
  } = req.body;

  if (!nombre || !email || !telefono || !estilo) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  // Solo se acepta con el justificante de un pago real que incluya ese tipo
  // de compra (lib/pagoBriefing.js).
  const pago = await comprobarPagoBriefing(supabase, referenciaPago(req.body || {}));
  const necesita = tipo === 'clase' ? pago.clase : pago.servicio;
  if (!pago.ok || !necesita) {
    return res.status(403).json({ error: 'Este formulario solo se puede enviar después de pagar. Si ya has pagado y ves esto, escríbenos y lo resolvemos.' });
  }

  // Enlaces: solo de plataformas conocidas y con https (lib/enlacesSeguros.js),
  // para que abrirlos desde el correo sea seguro.
  const demo = enlaceDemo && String(enlaceDemo).trim() ? comprobarEnlace(enlaceDemo) : null;
  if (demo && !demo.ok) {
    return res.status(400).json({ error: `Enlace de la demo: ${demo.motivo}` });
  }

  // Briefing de SEGUIMIENTO: además de los cuatro campos de siempre exige
  // qué se trabaja (mezcla y master o producción), los enlaces a los
  // proyectos más recientes y los plugins que más usa el cliente.
  const esSeguimiento = tipo === 'seguimiento';
  const MODALIDADES = {
    mezcla_master: 'Mezcla y master',
    produccion: 'Producción',
  };
  if (esSeguimiento) {
    const enlacesOk = typeof enlacesProyectos === 'string' && enlacesProyectos.trim();
    const pluginsOk = typeof plugins === 'string' && plugins.trim();
    if (!MODALIDADES[modalidad] || !enlacesOk || !pluginsOk) {
      return res.status(400).json({ error: 'Faltan campos obligatorios del seguimiento' });
    }
  }
  const proyectos = esSeguimiento ? comprobarEnlaces(enlacesProyectos) : null;
  if (proyectos && !proyectos.ok) {
    return res.status(400).json({ error: `Enlaces de tus proyectos: ${proyectos.motivo}` });
  }

  const resendApiKey = process.env.RESEND_API_KEY;

  if (!resendApiKey) {
    console.error('Falta RESEND_API_KEY en las variables de entorno');
    return res.status(500).json({ error: 'Error de configuración en el servidor' });
  }

  // El formulario de servicios no envía "tipo" (compatibilidad con el
  // formulario ya existente en pages/servicios/briefing.js), así que por
  // defecto tratamos el briefing como de servicio salvo que diga "clase".
  const tipoNormalizado = tipo === 'clase' ? 'clase' : 'servicio';
  const esClase = tipoNormalizado === 'clase';

  const etiquetaTipo = esSeguimiento ? 'SEGUIMIENTO' : esClase ? 'CLASE' : 'SERVICIO';

  // Todo lo que escribe el cliente se escapa para que no pueda alterar el
  // correo (ni colar enlaces o código).
  const escapar = (texto) => escaparHtml(texto).replace(/\n/g, '<br />');

  const camposEspecificosHtml = esSeguimiento
    ? `
          <p><strong>Quiere trabajar:</strong> ${MODALIDADES[modalidad]}</p>
          <p><strong>Enlaces a sus proyectos más recientes:</strong><br />${proyectos.enlaces.map((x) => enlaceParaCorreo({ ok: true, ...x })).join('<br /><br />')}</p>
          <p><strong>Plugins que usa mayoritariamente:</strong><br />${escapar(plugins.trim())}</p>
        `
    : esClase
    ? `<p><strong>Nivel de experiencia:</strong> ${nivel ? escapar(nivel) : 'No especificado'}</p>`
    : `
          <p><strong>Enlace a Demo/Maqueta:</strong><br />${enlaceParaCorreo(demo)}</p>
          <p><strong>¿Tiene Stems / Tracks listos?:</strong> ${tieneStems ? 'SÍ' : 'NO'}</p>
        `;

  // El seguimiento no tiene "detalles adicionales" (no se piden en su
  // formulario), así que ese bloque del correo solo sale en servicio/clase.
  const detallesHtml = esSeguimiento
    ? ''
    : `
          <br />
          <h3>Detalles adicionales y referencias:</h3>
          <p style="background: #111; color: #fff; padding: 15px; border-radius: 5px;">${detalles ? escapar(detalles) : 'Sin notas adicionales'}</p>
        `;

  try {
    // Envía la notificación con todos los datos del proyecto a tu correo personal
    const respuestaResend = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(prepararCorreo({
        from: 'The Lab System <pedidos@hottieprodthis.com>',
        to: ['pedidos.thelab@gmail.com'],
        subject: `📋 NUEVO BRIEFING DE ${etiquetaTipo}: ${String(nombre).slice(0, 80)}`,
        html: `
          <h2>¡Nuevo briefing de ${esSeguimiento ? 'seguimiento' : esClase ? 'clase' : 'proyecto'} recibido!</h2>
          <p><strong>Nombre / Nombre Artístico:</strong> ${escapar(nombre)}</p>
          <p><strong>Email de contacto:</strong> ${escapar(email)}</p>
          <p><strong>Teléfono / WhatsApp:</strong> ${escapar(telefono)}</p>
          <p><strong>Estilo musical:</strong> ${escapar(estilo)}</p>
          ${camposEspecificosHtml}
          ${detallesHtml}
        `,
      })),
    });

    // Si Resend no acepta el correo, el cliente tiene que saberlo (antes veía
    // "enviado" aunque el briefing no llegase a pedidos.thelab@gmail.com).
    if (!respuestaResend.ok) {
      const detalle = await respuestaResend.text().catch(() => '');
      console.error('guardar-briefing: Resend rechazó el correo:', respuestaResend.status, detalle);
      return res.status(502).json({ error: 'No se ha podido enviar el formulario. Inténtalo de nuevo en unos minutos.' });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error enviando el briefing:', error);
    return res.status(500).json({ error: 'Error al procesar el formulario' });
  }
}
