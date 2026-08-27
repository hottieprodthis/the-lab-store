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
    const metadata = session.metadata || {};

    let linksHtml = '';
    let linksText = '';

    // 1. Verificar si la compra proviene del carrito múltiple
    if (metadata.cart_data) {
      try {
        const cartItems = JSON.parse(metadata.cart_data);

        const itemsList = cartItems.map((item) => {
          const itemTitle = item.title || item.name || 'Producto Digital';
          const itemUrl = item.file_url || item.driveUrl || item.drive_url || item.link || '';
          
          if (itemUrl) {
            return `<li style="margin-bottom: 12px;">
              <strong>${itemTitle}</strong><br/>
              <a href="${itemUrl}" style="background:#CCFF00;color:#000;padding:8px 14px;text-decoration:none;border-radius:4px;display:inline-block;font-weight:bold;margin-top:4px;">
                Descargar / Acceder
              </a>
            </li>`;
          } else if (item.isService) {
            return `<li style="margin-bottom: 12px;">
              <strong>${itemTitle}</strong> (Servicio)<br/>
              <span style="color:#aaa;font-size:12px;">Nos pondremos en contacto contigo para coordinar el servicio.</span>
            </li>`;
          } else {
            return `<li style="margin-bottom: 12px;">
              <strong>${itemTitle}</strong><br/>
              <span style="color:red;font-size:12px;">Enlace no disponible. Te lo enviaremos por email.</span>
            </li>`;
          }
        });

        linksHtml = `<ul style="list-style:none;padding:0;">${itemsList.join('')}</ul>`;
        linksText = cartItems.map(i => `${i.title || i.name}: ${i.file_url || 'Servicio'}`).join(' | ');
      } catch (e) {
        console.error('Error al parsear cart_data:', e);
      }
    }

    // 2. Si no es un carrito múltiple, procesar como compra individual (fallback)
    if (!linksHtml) {
      const enlaceDrive = 
        metadata.driveUrl || 
        metadata.file_url || 
        metadata.fileUrl || 
        metadata.drive_url || 
        metadata.link || 
        '';

      if (enlaceDrive) {
        linksHtml = `<p><a href="${enlaceDrive}" style="background:#CCFF00;color:#000;padding:12px 20px;text-decoration:none;border-radius:5px;display:inline-block;font-weight:bold;">Acceder al contenido digital</a></p>`;
        linksText = enlaceDrive;
      } else if (metadata.isService === 'true') {
        linksHtml = `<p>Has reservado un servicio. Te contactaremos en breve para coordinar los detalles.</p>`;
        linksText = 'Servicio contratado';
      } else {
        linksHtml = `<p style="color:red;">Ha habido un problema cargando tu enlace de descarga automático. Por favor responde a este correo para enviártelo manualmente.</p>`;
        linksText = 'Error enlace';
      }
    }

    const resendApiKey = process.env.RESEND_API_KEY;

    if (!resendApiKey) {
      console.error('Falta la variable RESEND_API_KEY en Vercel');
      return res.status(500).json({ error: 'Falta la API Key de Resend' });
    }

    try {
      // Notificación de venta para el administrador
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'The Lab System <pedidos@hottieprodthis.com>',
          to: ['pedidos.thelab@gmail.com'],
          subject: `🚨 NUEVO PAGO RECIBIDO: ${nombreCliente}`,
          html: `
            <h2>¡Nuevo pago completado en Stripe!</h2>
            <p><strong>Cliente:</strong> ${nombreCliente}</p>
            <p><strong>Email:</strong> ${emailCliente}</p>
            <p><strong>Total pagado:</strong> ${(session.amount_total / 100).toFixed(2)} ${session.currency.toUpperCase()}</p>
            <p><strong>Artículos/Enlaces:</strong> ${linksText}</p>
          `,
        }),
      });

      // Correo instantáneo para el cliente
      if (emailCliente) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'The Lab <pedidos@hottieprodthis.com>',
            reply_to: 'pedidos.thelab@gmail.com',
            to: [emailCliente],
            subject: 'Tu pedido en The Lab - Acceso a tus artículos',
            html: `
              <h2>¡Gracias por tu compra, ${nombreCliente}!</h2>
              <p>Tu pago se ha procesado correctamente.</p>
              <p>Aquí tienes el acceso a tus artículos:</p>
              ${linksHtml}
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
