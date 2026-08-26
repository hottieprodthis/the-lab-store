import nodemailer from 'nodemailer';
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

    // Obtiene dinámicamente el enlace desde los metadatos de Stripe
    const enlaceDrive = session.metadata?.driveUrl || session.metadata?.link || session.metadata?.fileUrl;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'pedidos.thelab@gmail.com',
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    try {
      // 1. Notificación para ti
      await transporter.sendMail({
        from: '"The Lab System" <pedidos.thelab@gmail.com>',
        to: 'pedidos.thelab@gmail.com',
        subject: `🚨 NUEVO PAGO RECIBIDO: ${nombreCliente}`,
        html: `
          <h2>¡Nuevo pago completado en Stripe!</h2>
          <p><strong>Cliente:</strong> ${nombreCliente}</p>
          <p><strong>Email:</strong> ${emailCliente}</p>
          <p><strong>Total pagado:</strong> ${(session.amount_total / 100).toFixed(2)} ${session.currency.toUpperCase()}</p>
          <p><strong>Enlace enviado:</strong> ${enlaceDrive || 'Sin enlace adjunto en metadata'}</p>
        `,
      });

      // 2. Correo al cliente
      if (emailCliente) {
        await transporter.sendMail({
          from: '"The Lab - Hottie" <pedidos.thelab@gmail.com>',
          to: emailCliente,
          subject: 'Tu pedido en The Lab - Acceso al producto',
          html: `
            <h2>¡Gracias por tu compra, ${nombreCliente}!</h2>
            <p>Tu pago se ha procesado correctamente.</p>
            <p>Puedes acceder a tu contenido digital directamente a través de este enlace:</p>
            <p><a href="${enlaceDrive}" style="background:#0070f3;color:#fff;padding:10px 15px;text-decoration:none;border-radius:5px;">Acceder al archivo en Google Drive</a></p>
          `,
        });
      }
    } catch (error) {
      console.error('Error al enviar el correo:', error);
      return res.status(500).json({ message: 'Error en el envío de correo' });
    }
  }

  return res.status(200).json({ received: true });
}
