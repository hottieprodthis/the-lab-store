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
          const itemTitle = item.title || item.name || (item.isService ? 'Servicio Digital' : 'Producto Digital');
          const itemUrl = item.file_url || item.driveUrl || item.drive_url || item.link || '';
          
          if (item.isService) {
            return `<li style="margin-bottom: 20px;">
              <strong style="font-size: 16px;">${itemTitle} <span style="color:#888888; font-weight:normal;">(Servicio)</span></strong><br/>
              <span style="color:#aaa;font-size:13px;display:block;margin-top:4px;">Nos pondremos en contacto contigo para coordinar el servicio.</span>
            </li>`;
          } else if (itemUrl) {
            return `<li style="margin-bottom: 20px;">
              <strong style="font-size: 16px;">${itemTitle} <span style="color:#888888; font-weight:normal;">(Producto)</span></strong><br/>
              <div style="margin-top:8px;">
                <a href="${itemUrl}" target="_blank" style="background-color:#CCFF00 !important; color:#000000 !important; padding:12px 20px; text-decoration:none; border-radius:6px; display:inline-block; font-weight:bold; font-size:14px; text-transform:uppercase; border: none;">
                  Descargar / Acceder
                </a>
              </div>
            </li>`;
          } else {
            return `<li style="margin-bottom: 20px;">
              <strong style="font-size: 16px;">${itemTitle} <span style="color:#888888; font-weight:normal;">(Producto)</span></strong><br/>
              <span style="color:#ff4444;font-size:13px;display:block;margin-top:4px;">Enlace no disponible. Te lo enviaremos manualmente a este correo.</span>
            </li>`;
          }
        });

        linksHtml = `<ul style="list-style:none;padding:0;margin-top:15px;">${itemsList.join('')}</ul>`;
        linksText = cartItems.map(i => `${i.title || 'Artículo'}: ${i.file_url || 'Servicio'}`).join(' | ');
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
      
      const singleTitle = metadata.product_name || (metadata.is_service === 'true' ? 'Servicio Digital' : 'Producto Digital');

      if (metadata.is_service === 'true') {
        linksHtml = `<p><strong style="font-size:16px;">${singleTitle} <span style="color:#888888; font-weight:normal;">(Servicio)</span></strong></p><p style="color:#aaa;font-size:13px;">Nos pondremos en contacto contigo para coordinar el servicio.</p>`;
        linksText = `${singleTitle} (Servicio)`;
      } else if (enlaceDrive) {
        linksHtml = `
          <p><strong style="font-size:16px;">${singleTitle} <span style="color:#888888; font-weight:normal;">(Producto)</span></strong></p>
          <div style="margin-top:10px;">
            <a href="${enlaceDrive}" target="_blank" style="background-color:#CCFF00 !important; color:#000000 !important; padding:12px 20px; text-decoration:none; border-radius:6px; display:inline-block; font-weight:bold; font-size:14px; text-transform:uppercase;">
              Descargar / Acceder
            </a>
          </div>
        `;
        linksText = `${singleTitle}: ${enlaceDrive}`;
      } else {
        linksHtml = `<p style="color:#ff4444;">Ha habido un problema cargando tu enlace de descarga automático. Por favor responde a este correo para enviártelo manualmente.</p>`;
        linksText = 'Error enlace';
      }
    }

    const resendApiKey = process.env.RESEND_API_KEY;

    if (!resendApiKey) {
      console.error('Falta la variable RESEND_API_KEY en Vercel');
      return res.status(500).json({ error: 'Falta la API Key de Resend' });
    }

    try {
      // Notificación para el administrador
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

      // Correo para el cliente
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
