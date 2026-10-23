import { prepararCorreo } from '../../lib/correos';

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

  // Los textos libres del seguimiento se escapan para que lo que escriba el
  // cliente no pueda alterar el correo.
  const escapar = (texto) =>
    String(texto)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/\n/g, '<br />');

  const camposEspecificosHtml = esSeguimiento
    ? `
          <p><strong>Quiere trabajar:</strong> ${MODALIDADES[modalidad]}</p>
          <p><strong>Enlaces a sus proyectos más recientes:</strong><br />${escapar(enlacesProyectos.trim())}</p>
          <p><strong>Plugins que usa mayoritariamente:</strong><br />${escapar(plugins.trim())}</p>
        `
    : esClase
    ? `<p><strong>Nivel de experiencia:</strong> ${nivel || 'No especificado'}</p>`
    : `
          <p><strong>Enlace a Demo/Maqueta:</strong> ${enlaceDemo ? `<a href="${enlaceDemo}">${enlaceDemo}</a>` : 'No adjuntado'}</p>
          <p><strong>¿Tiene Stems / Tracks listos?:</strong> ${tieneStems ? 'SÍ' : 'NO'}</p>
        `;

  // El seguimiento no tiene "detalles adicionales" (no se piden en su
  // formulario), así que ese bloque del correo solo sale en servicio/clase.
  const detallesHtml = esSeguimiento
    ? ''
    : `
          <br />
          <h3>Detalles adicionales y referencias:</h3>
          <p style="background: #111; color: #fff; padding: 15px; border-radius: 5px;">${detalles || 'Sin notas adicionales'}</p>
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
        subject: `📋 NUEVO BRIEFING DE ${etiquetaTipo}: ${nombre}`,
        html: `
          <h2>¡Nuevo briefing de ${esSeguimiento ? 'seguimiento' : esClase ? 'clase' : 'proyecto'} recibido!</h2>
          <p><strong>Nombre / Nombre Artístico:</strong> ${nombre}</p>
          <p><strong>Email de contacto:</strong> ${email}</p>
          <p><strong>Teléfono / WhatsApp:</strong> ${telefono}</p>
          <p><strong>Estilo musical:</strong> ${estilo}</p>
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
