import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método no permitido' });
  }

  const { nombreReal, nombreArtistico, emailCliente, contacto, tipoPedido, detallesServicio } = req.body;

  if (!nombreReal || !emailCliente || !contacto) {
    return res.status(400).json({ message: 'Faltan campos obligatorios' });
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'pedidos.thelab@gmail.com',
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  const esServicio = tipoPedido === 'servicio';

  try {
    // Correo que te llega a ti
    await transporter.sendMail({
      from: '"The Lab System" <pedidos.thelab@gmail.com>',
      to: 'pedidos.thelab@gmail.com',
      subject: `🚨 NUEVO PEDIDO [${esServicio ? 'SERVICIO' : 'TIENDA'}]: ${nombreArtistico || nombreReal}`,
      html: `
        <h2>Nuevo Pedido Recibido</h2>
        <p><strong>Tipo:</strong> ${esServicio ? 'Servicio (Producción/Mezcla/Master/Clase)' : 'Artículo de Tienda'}</p>
        <hr />
        <p><strong>Nombre Real:</strong> ${nombreReal}</p>
        <p><strong>Nombre Artístico:</strong> ${nombreArtistico || 'No especificado'}</p>
        <p><strong>Email:</strong> ${emailCliente}</p>
        <p><strong>Contacto (WhatsApp/Discord/IG):</strong> ${contacto}</p>
        ${
          esServicio
            ? `
          <hr />
          <h3>Visión / Guía detallada del proyecto:</h3>
          <p style="white-space: pre-wrap; background: #f4f4f4; padding: 12px; border-radius: 6px; color: #000;">${detallesServicio}</p>
        `
            : ''
        }
      `,
    });

    // Confirmación al cliente
    await transporter.sendMail({
      from: '"The Lab - Hottie" <pedidos.thelab@gmail.com>',
      to: emailCliente,
      subject: 'Confirmación de tu pedido - The Lab',
      html: `
        <h2>¡Gracias, ${nombreArtistico || nombreReal}!</h2>
        <p>Hemos recibido los datos de tu pedido correctamente.</p>
        <p>Nos pondremos en contacto contigo lo antes posible a través del contacto facilitado.</p>
      `,
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error al enviar el correo' });
  }
}
