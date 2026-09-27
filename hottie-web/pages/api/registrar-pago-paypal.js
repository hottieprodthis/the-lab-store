import { createClient } from '@supabase/supabase-js';

// Igual que en checkout.js / enviar-pedido.js: usamos la Service Role Key
// en el servidor para poder escribir en "purchases" sin que las políticas
// RLS del cliente bloqueen la operación.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const TABLE_BY_TIPO = {
  producto: 'products',
  servicio: 'services',
  clase: 'classes',
};

const btnStyle = 'background-color:#CCFF00 !important; color:#000000 !important; padding:14px 22px; text-decoration:none; border-radius:6px; display:inline-block; font-weight:900; font-size:14px; text-transform:uppercase; letter-spacing:0.5px; border:none;';

// Registra en el historial del área de clientes (tabla "purchases") y
// envía los correos de confirmación de una compra individual pagada con
// PayPal directamente desde la ficha de un producto/servicio/clase (los
// botones "Comprar con tarjeta"/"Reservar" ya guardaban esto vía Stripe;
// el botón de PayPal en esas mismas páginas no llamaba a ningún sitio, así
// que esas compras nunca aparecían en el historial). No se crea ninguna
// tabla ni arquitectura nueva: se reutiliza "purchases" exactamente igual
// que hace pages/api/enviar-pedido.js para las compras con Stripe.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método no permitido' });
  }

  try {
    const {
      tipo,
      itemId,
      userId,
      userEmail,
      payerEmail,
      payerName,
      paypalOrderId,
    } = req.body || {};

    const tipoNormalizado = TABLE_BY_TIPO[tipo] ? tipo : 'producto';
    const tabla = TABLE_BY_TIPO[tipoNormalizado];

    if (!itemId) {
      return res.status(400).json({ error: 'Falta itemId' });
    }

    // 1. Buscamos el artículo real en la base de datos para no fiarnos de
    // nada que venga solo del navegador (nombre, precio, imagen, enlace).
    const { data: item, error: itemError } = await supabase
      .from(tabla)
      .select('*')
      .eq('id', itemId)
      .single();

    if (itemError || !item) {
      console.error('registrar-pago-paypal: artículo no encontrado', tabla, itemId, itemError?.message);
      return res.status(404).json({ error: 'Artículo no encontrado' });
    }

    const nombreItem = item.name || item.title || item.nombre || 'Artículo';
    const precioCents = item.price_cents ?? item.precio_centimos ?? null;
    const moneda = item.currency || item.moneda || 'eur';
    const imagen = item.image_url || item.imagen_url || null;
    const enlaceDescarga = tipoNormalizado === 'producto'
      ? (item.file_url || item.drive_url || item.driveUrl || item.download_url || item.link || '')
      : '';

    // 2. Resolvemos el usuario: primero lo que ya nos manda el cliente
    // (sesión activa), y si no lo tenemos, lo buscamos por email igual que
    // hacen checkout.js y enviar-pedido.js.
    let resolvedUserId = userId || null;
    const emailParaBuscar = userEmail || payerEmail || null;

    if (!resolvedUserId && emailParaBuscar) {
      try {
        const { data: foundId } = await supabase.rpc('get_user_id_by_email', {
          email_input: String(emailParaBuscar).trim(),
        });
        if (foundId) resolvedUserId = foundId;
      } catch (err) {
        console.error('registrar-pago-paypal: error buscando usuario por email vía RPC:', err);
      }
    }

    const amount = typeof precioCents === 'number' ? precioCents / 100 : 0;

    // 3. Guardamos en el historial del área de clientes.
    if (resolvedUserId) {
      const { error: dbError } = await supabase.from('purchases').insert([
        {
          user_id: resolvedUserId,
          amount,
          plan_name: nombreItem,
          items: [
            {
              name: nombreItem,
              type: tipoNormalizado,
              quantity: 1,
              price_cents: precioCents,
              currency: moneda,
              image_url: imagen,
            },
          ],
        },
      ]);

      if (dbError) {
        console.error('registrar-pago-paypal: error guardando en Supabase:', dbError.message);
      }
    } else {
      console.warn('registrar-pago-paypal: pago de PayPal sin usuario identificado, no se guarda en el historial. Email recibido:', emailParaBuscar);
    }

    // 4. Correos de confirmación (mismo patrón que enviar-pedido.js).
    const resendApiKey = process.env.RESEND_API_KEY;
    const nombreCliente = payerName || (emailParaBuscar ? emailParaBuscar.split('@')[0] : 'Cliente');
    const destinoEmail = emailParaBuscar;

    let linksHtml;
    let linksText;

    if (tipoNormalizado === 'servicio' || tipoNormalizado === 'clase') {
      const etiqueta = tipoNormalizado === 'clase' ? 'Clase' : 'Servicio';
      linksHtml = `<p><strong style="font-size:16px; color:#ffffff;">${nombreItem} <span style="color:#aaaaaa; font-weight:normal;">(${etiqueta})</span></strong></p><p style="color:#cccccc;font-size:13px;">Nos pondremos en contacto contigo para coordinarlo.</p>`;
      linksText = `${nombreItem} (${etiqueta})`;
    } else if (enlaceDescarga) {
      linksHtml = `
        <p><strong style="font-size:16px; color:#ffffff;">${nombreItem} <span style="color:#aaaaaa; font-weight:normal;">(Tienda)</span></strong></p>
        <div style="margin-top:10px;">
          <table border="0" cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td align="center" bgcolor="#CCFF00" style="border-radius:6px; background-color:#CCFF00;">
                <a href="${enlaceDescarga}" target="_blank" style="${btnStyle}">
                  Descargar / Acceder
                </a>
              </td>
            </tr>
          </table>
        </div>
      `;
      linksText = `${nombreItem}: ${enlaceDescarga}`;
    } else {
      linksHtml = `<p style="color:#ff5555;">Ha habido un problema cargando tu enlace de descarga automático. Por favor responde a este correo para enviártelo manualmente.</p>`;
      linksText = 'Error enlace';
    }

    if (resendApiKey) {
      try {
        // Notificación al admin
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'The Lab System <pedidos@hottieprodthis.com>',
            to: ['pedidos.thelab@gmail.com'],
            subject: `🚨 NUEVO PAGO RECIBIDO (PayPal): ${nombreCliente}`,
            html: `
              <h2>¡Nuevo pago completado con PayPal!</h2>
              <p><strong>Cliente:</strong> ${nombreCliente}</p>
              <p><strong>Email:</strong> ${destinoEmail || 'No disponible'}</p>
              <p><strong>Total pagado:</strong> ${amount} €</p>
              <p><strong>Artículo:</strong> ${linksText}</p>
              ${paypalOrderId ? `<p><strong>ID de orden PayPal:</strong> ${paypalOrderId}</p>` : ''}
            `,
          }),
        });

        // Confirmación al cliente
        if (destinoEmail) {
          const fullEmailHtml = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta name="color-scheme" content="light dark">
              <meta name="supported-color-schemes" content="light dark">
            </head>
            <body style="background-color:#0d0d0d; color:#ffffff; font-family: Arial, sans-serif; padding:20px;">
              <h2 style="color:#ffffff;">¡Gracias por tu compra, ${nombreCliente}!</h2>
              <p style="color:#dddddd;">Tu pago con PayPal se ha procesado correctamente.</p>
              <p style="color:#dddddd;">Aquí tienes el acceso a tu artículo:</p>
              ${linksHtml}
            </body>
            </html>
          `;

          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'The Lab <pedidos@hottieprodthis.com>',
              reply_to: 'pedidos.thelab@gmail.com',
              to: [destinoEmail],
              subject: 'Tu pedido en The Lab - Acceso a tus artículos',
              html: fullEmailHtml,
            }),
          });
        }
      } catch (emailError) {
        console.error('registrar-pago-paypal: error enviando correos con Resend:', emailError);
      }
    } else {
      console.error('registrar-pago-paypal: falta RESEND_API_KEY en Vercel, no se enviaron correos.');
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('registrar-pago-paypal: error inesperado:', err);
    return res.status(500).json({ error: 'Error al registrar el pago de PayPal' });
  }
}
