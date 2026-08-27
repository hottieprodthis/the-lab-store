import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const config = {
  api: {
    bodyParser: false,
  },
};

async function buffer(readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método no permitido' });
  }

  let event;

  try {
    const buf = await buffer(req);
    const sig = req.headers['stripe-signature'];

    event = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error(`Error de firma de Webhook: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const emailCliente = session.customer_details?.email;
    const nombreCliente = session.customer_details?.name || 'Cliente';

    // Captura exhaustiva de la URL de Drive desde los metadatos
    const metadata = session.metadata || {};
    const enlaceDrive = 
      metadata.driveUrl || 
      metadata.file_url || 
      metadata.fileUrl || 
      metadata.drive_url || 
      metadata.link || 
      '';

    const resendApiKey = process.env.RESEND_API_KEY;

    if (!resendApiKey) {
      console.error('Falta la variable RESEND_API_KEY en Vercel');
      return res.status(500).json({ error: 'Falta la API Key de Resend' });
    }

    try {
      // 1. Notificación instantánea para ti
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'The Lab System <onboarding@resend.dev>',
          to: ['pedidos.thelab@gmail.com'],
          subject: `🚨 NUEVO PAGO RECIBIDO: ${nombreCliente}`,
          html: `
            <h2>¡Nuevo pago completado en Stripe!</h2>
            <p><strong>Cliente:</strong> ${nombreCliente}</p>
            <p><strong>Email:</strong> ${emailCliente}</p>
            <p><strong>Total pagado:</strong> ${(session.amount_total / 100).toFixed(2)} ${session.currency.toUpperCase()}</p>
            <p><strong>Enlace enviado:</strong> ${enlaceDrive || 'Sin enlace adjunto en metadata'}</p>
          `,
        }),
      });

      // 2. Correo instantáneo al cliente
      if (emailCliente) {
        const botonHtml = enlaceDrive 
          ? `<p><a href="${enlaceDrive}" style="background:#0070f3;color:#fff;padding:12px 20px;text-decoration:none;border-radius:5px;display:inline-block;font-weight:bold;">Acceder al archivo en Google Drive</a></p>`
          : `<p style="color:red;">Ha habido un problema cargando tu enlace de descarga automático. Por favor responde a este correo para enviártelo manualmente.</p>`;

        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'The Lab <onboarding@resend.dev>',
            to: [emailCliente],
            subject: 'Tu pedido en The Lab - Acceso al producto',
            html: `
              <h2>¡Gracias por tu compra, ${nombreCliente}!</h2>
              <p>Tu pago se ha procesado correctamente.</p>
              <p>Puedes acceder a tu contenido digital directamente a través de este enlace:</p>
              ${botonHtml}
            `,
          }),
        });
      }
    } catch (error) {
      console.error('Error al enviar el correo con Resend:', error);
      return res.status(500).json({ message: 'Error en el envío de correo' });
    }
  }

  return res.status(200).json({ received: true });
}
