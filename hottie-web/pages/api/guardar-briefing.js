export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método no permitido' });
  }

  const { nombre, email, telefono, estilo, enlaceDemo, tieneStems, detalles } = req.body;

  if (!nombre || !email || !telefono || !estilo) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  const resendApiKey = process.env.RESEND_API_KEY;

  if (!resendApiKey) {
    console.error('Falta RESEND_API_KEY en las variables de entorno');
    return res.status(500).json({ error: 'Error de configuración en el servidor' });
  }

  try {
    // Envía la notificación con todos los datos del proyecto a tu correo personal
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'The Lab System <pedidos@hottieprodthis.com>',
        to: ['pedidos.thelab@gmail.com'],
        subject: `📋 NUEVO BRIEFING DE SERVICIO: ${nombre}`,
        html: `
          <h2>¡Nuevo briefing de proyecto recibido!</h2>
          <p><strong>Nombre / Nombre Artístico:</strong> ${nombre}</p>
          <p><strong>Email de contacto:</strong> ${email}</p>
          <p><strong>Teléfono / WhatsApp:</strong> ${telefono}</p>
          <p><strong>Estilo musical:</strong> ${estilo}</p>
          <p><strong>Enlace a Demo/Maqueta:</strong> ${enlaceDemo ? `<a href="${enlaceDemo}">${enlaceDemo}</a>` : 'No adjuntado'}</p>
          <p><strong>¿Tiene Stems / Tracks listos?:</strong> ${tieneStems ? 'SÍ' : 'NO'}</p>
          <br />
          <h3>Detalles adicionales y referencias:</h3>
          <p style="background: #111; color: #fff; padding: 15px; border-radius: 5px;">${detalles || 'Sin notas adicionales'}</p>
        `,
      }),
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error enviando el briefing:', error);
    return res.status(500).json({ error: 'Error al procesar el formulario' });
  }
}
