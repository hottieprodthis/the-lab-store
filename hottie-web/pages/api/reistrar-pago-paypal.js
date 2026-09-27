import { createClient } from '@supabase/supabase-js';

// Igual que en checkout.js y enviar-pedido.js: usamos la Service Role Key
// para poder escribir en "purchases" sin bloqueos de RLS.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { paypalOrderId, payerEmail, item, userId: bodyUserId, userEmail, clientName } = req.body;

  if (!item || !item.id) {
    return res.status(400).json({ error: 'Falta el artículo comprado.' });
  }

  try {
    let resolvedUserId = bodyUserId || null;

    // Si no llega el ID de usuario, lo buscamos por email (misma lógica que Stripe)
    if (!resolvedUserId && (userEmail || payerEmail)) {
      try {
        const { data: foundId } = await supabase.rpc('get_user_id_by_email', {
          email_input: (userEmail || payerEmail).trim(),
        });
        if (foundId) resolvedUserId = foundId;
      } catch (err) {
        console.error('Error buscando usuario por email (PayPal):', err);
      }
    }

    // Volvemos a mirar la base de datos para confirmar nombre/tipo real del artículo
    let dbItem = null;
    let isService = !!item.isService;
    let isClass = !!item.isClass;

    const { data: sData } = await supabase.from('services').select('*').eq('id', item.id).single();
    if (sData) {
      dbItem = sData;
      isService = true;
    } else {
      const { data: cData } = await supabase.from('classes').select('*').eq('id', item.id).single();
      if (cData) {
        dbItem = cData;
        isClass = true;
      } else {
        const { data: pData } = await supabase.from('products').select('*').eq('id', item.id).single();
        if (pData) {
          dbItem = pData;
        }
      }
    }

    const finalName = item.name || dbItem?.name || 'Compra con PayPal';
    const finalAmount = item.price_cents
      ? item.price_cents / 100
      : (dbItem?.price_cents ? dbItem.price_cents / 100 : 0);
    const downloadUrl = item.file_url || dbItem?.file_url || '';

    if (resolvedUserId) {
      const { error: dbError } = await supabase.from('purchases').insert([
        {
          user_id: resolvedUserId,
          amount: finalAmount,
          plan_name: finalName,
        },
      ]);
      if (dbError) {
        console.error('Error guardando compra de PayPal en Supabase:', dbError.message);
      }
    } else {
      console.warn('Compra de PayPal sin usuario asociado (no se guardó en el historial):', paypalOrderId);
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    const destinoEmail = userEmail || payerEmail;
    const nombreCliente = clientName || (destinoEmail ? destinoEmail.split('@')[0] : 'Cliente');

    if (resendApiKey) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'The Lab System <pedidos@hottieprodthis.com>',
            to: ['pedidos.thelab@gmail.com'],
            subject: `🚨 NUEVO PAGO CON PAYPAL: ${nombreCliente}`,
            html: `
              <h2>¡Nuevo pago completado con PayPal!</h2>
              <p><strong>Cliente:</strong> ${nombreCliente}</p>
              <p><strong>Email:</strong> ${destinoEmail || 'No disponible'}</p>
              <p><strong>Total:</strong> ${finalAmount} €</p>
              <p><strong>Artículo:</strong> ${finalName}${isService ? ' (Servicio)' : isClass ? ' (Clase)' : ''}</p>
              <p><strong>ID de PayPal:</strong> ${paypalOrderId || 'N/D'}</p>
            `,
          }),
        });

        if (destinoEmail) {
          const linksHtml = isService || isClass
            ? `<p><strong style="font-size:16px; color:#ffffff;">${finalName}</strong></p><p style="color:#cccccc;font-size:13px;">Nos pondremos en contacto contigo para coordinarlo.</p>`
            : downloadUrl
              ? `<p><strong style="font-size:16px; color:#ffffff;">${finalName}</strong></p>
                 <div style="margin-top:10px;">
                   <a href="${downloadUrl}" target="_blank" style="background-color:#CCFF00; color:#000000; padding:14px 22px; text-decoration:none; border-radius:6px; display:inline-block; font-weight:900; font-size:14px; text-transform:uppercase;">Descargar / Acceder</a>
                 </div>`
              : `<p style="color:#cccccc;">Pedido registrado correctamente.</p>`;

          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'The Lab <pedidos@hottieprodthis.com>',
              reply_to: 'pedidos.thelab@gmail.com',
              to: [destinoEmail],
              subject: 'Tu pedido en The Lab - Confirmación de pago con PayPal',
              html: `
                <!DOCTYPE html>
                <html>
                <body style="background-color:#0d0d0d; color:#ffffff; font-family: Arial, sans-serif; padding:20px;">
                  <h2 style="color:#ffffff;">¡Gracias por tu compra, ${nombreCliente}!</h2>
                  <p style="color:#dddddd;">Tu pago con PayPal se ha procesado correctamente.</p>
                  ${linksHtml}
                </body>
                </html>
              `,
            }),
          });
        }
      } catch (emailError) {
        console.error('Error enviando correos de PayPal con Resend:', emailError);
      }
    }

    return res.status(200).json({ success: true, savedToHistory: !!resolvedUserId });
  } catch (err) {
    console.error('Error registrando pago de PayPal:', err);
    return res.status(500).json({ error: 'No se ha podido registrar el pago.' });
  }
}
