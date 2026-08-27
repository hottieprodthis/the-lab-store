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

    const btnStyle = 'background-color:#CCFF00 !important; color:#000000 !important; padding:14px 22px; text-decoration:none; border-radius:6px; display:inline-block; font-weight:900; font-size:14px; text-transform:uppercase; letter-spacing:0.5px; border:none;';

    // 1. Carrito múltiple
    if (metadata.cart_data) {
      try {
        const cartItems = JSON.parse(metadata.cart_data);

        const itemsList = cartItems.map((item) => {
          let itemTitle = item.title;
          if (itemTitle === undefined || itemTitle === null || itemTitle === '') {
            itemTitle = item.name || item.nombre || (item.isService ? 'Servicio Digital' : 'Producto Digital');
          }
          
          const itemUrl = item.file_url || item.driveUrl || item.drive_url || item.link || '';
          
          if (item.isService) {
            return `<li style="margin-bottom: 24px;">
              <strong style="font-size: 16px; color:#ffffff;">${itemTitle} <span style="color:#aaaaaa; font-weight:normal;">(Servicio)</span></strong><br/>
              <span style="color:#cccccc;font-size:13px;display:block;margin-top:6px;">Nos pondremos en contacto contigo para coordinar el servicio.</span>
            </li>`;
          } else if (itemUrl) {
            return `<li style="margin-bottom: 24px;">
              <strong style="font-size: 16px; color:#ffffff;">${itemTitle} <span style="color:#aaaaaa; font-weight:normal;">(Tienda)</span></strong><br/>
              <div style="margin-top:10px;">
                <table border="0" cellpadding="0" cellspacing="0" role="presentation">
                  <tr>
                    <td align="center" bgcolor="#CCFF00" style="border-radius:6px; background-color:#CCFF00;">
                      <a href="${itemUrl}" target="_blank" style="${btnStyle}">
                        Descargar / Acceder
                      </a>
                    </td>
                  </tr>
                </table>
              </div>
            </li>`;
          } else {
            return `<li style="margin-bottom: 24px;">
              <strong style="font-size: 16px; color:#ffffff;">${itemTitle} <span style="color:#aaaaaa; font-weight:normal;">(Tienda)</span></strong><br/>
              <span style="color:#ff5555;font-size:13px;display:block;margin-top:6px;">Enlace no disponible. Te lo enviaremos manualmente a este correo.</span>
            </li>`;
          }
        });

        linksHtml = `<ul style="list-style:none;padding:0;margin-top:15px;">${itemsList.join('')}</ul>`;
        linksText = cartItems.map(i => `${i.title}: ${i.file_url || 'Servicio'}`).join(' | ');
      } catch (e) {
        console.error('Error al parsear cart_data:', e);
      }
    }

    // 2. Compra individual (fallback)
    if (!linksHtml) {
      const enlaceDrive = 
        metadata.driveUrl || 
        metadata.file_url || 
        metadata.fileUrl || 
        metadata.drive_url || 
        metadata.link || 
        '';
      
      let singleTitle = metadata.product_name;
      if (singleTitle === undefined || singleTitle === null || singleTitle === '') {
        singleTitle = metadata.is_service === 'true' ? 'Servicio Digital' : 'Producto Digital';
      }

      if (metadata.is_service === 'true') {
        linksHtml = `<p><strong style="font-size:16px; color:#ffffff;">${singleTitle} <span style="color:#aaaaaa; font-weight:normal;">(Servicio)</span></strong></p><p style="color:#cccccc;font-size:13px;">Nos pondremos en contacto contigo para coordinar el servicio.</p>`;
        linksText = `${singleTitle} (Servicio)`;
      } else if (enlaceDrive) {
        linksHtml = `
          <p><strong style="font-size:16px; color:#ffffff;">${singleTitle} <span style="color:#aaaaaa; font-weight:normal;">(Tienda)</span></strong></p>
          <div style="margin-top:10px;">
            <table border="0" cellpadding="0" cellspacing="0" role="presentation">
              <tr>
                <td align="center" bgcolor="#CCFF00" style="border-radius:6px; background-color:#CCFF00;">
                  <a href="${enlaceDrive}" target="_blank" style="${btnStyle}">
                    Descargar / Acceder
                  </a>
                </td>
              </tr>
            </table>
          </div>
        `;
        linksText = `${singleTitle}: ${enlaceDrive}`;
      } else {
        linksHtml = `<p style="color:#ff5555;">Ha habido un problema cargando tu enlace de descarga automático. Por favor responde a este correo para enviártelo manualmente.</p>`;
        linksText = 'Error enlace';
      }
    }

    const resendApiKey = process.env.RESEND_API_KEY;

    if (!resendApiKey) {
      console.error('Falta la variable RESEND_API_KEY en Vercel');
      return res.status(500).json({ error: 'Falta la API Key de Resend' });
    }

    const fullEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="color-scheme" content="light dark">
        <meta name="supported-color-schemes" content="light dark">
      </head>
      <body style="background-color:#0d0d0d; color:#ffffff; font-family: Arial, sans-serif; padding:20px;">
        <h2 style="color:#ffffff;">¡Gracias por tu compra, ${nombreCliente}!</h2>
        <p style="color:#dddddd;">Tu pago se ha procesado correctamente.</p>
        <p style="color:#dddddd;">Aquí tienes el acceso a tus artículos:</p>
        ${linksHtml}
      </body>
      </html>
    `;

    try {
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
            html: fullEmailHtml,
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
