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
      items,
      planName,
      amountCents,
      userId,
      userEmail,
      payerEmail,
      payerName,
      paypalOrderId,
    } = req.body || {};

    // Carrito con varios artículos a la vez (botón de PayPal del carrito
    // flotante, components/CartFloating.js): se resuelve y se guarda por
    // separado más abajo, sin tocar nada del camino de un solo artículo
    // que ya usan las fichas de producto/servicio/clase.
    if (Array.isArray(items) && items.length > 0) {
      return handleCarritoPaypal(req, res, {
        items, userId, userEmail, payerEmail, payerName, paypalOrderId,
      });
    }

    // Cobro único de un mes de la suscripción del área de clientes pagado
    // con PayPal (pages/area-cliente.js). No hay itemId porque no es una
    // fila de products/services/classes, así que se resuelve aparte: la
    // activación del acceso (profiles.is_subscribed) ya la hace el cliente
    // vía RPC antes de llamar aquí; esto solo registra el historial y
    // manda los correos.
    if (tipo === 'suscripcion') {
      return handleSuscripcionPaypal(req, res, {
        amountCents, userId, userEmail, payerEmail, payerName, paypalOrderId,
      });
    }

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

    // planName/amountCents: solo los mandan las páginas de servicios/clases
    // cuando el artículo tiene "planes" (varias tarifas) y el cliente ha
    // elegido uno para pagar con PayPal — en ese caso el precio real
    // cobrado es el del plan, no el precio base de la tabla, así que si
    // vienen informados tienen prioridad. Para el resto de llamadas (ficha
    // de producto individual, ya en funcionamiento) no se mandan y el
    // comportamiento no cambia.
    const nombreItem = planName ? `${item.name || item.title || item.nombre || 'Artículo'} (${planName})` : (item.name || item.title || item.nombre || 'Artículo');
    const precioCents = typeof amountCents === 'number' ? amountCents : (item.price_cents ?? item.precio_centimos ?? null);
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

// Extrae el UUID real de un id de carrito con plan ("uuid-nombredelplan"),
// igual que hace pages/api/checkout.js.
function extractRealId(id) {
  if (!id) return id;
  const match = String(id).match(/^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/);
  return match ? match[1] : String(id);
}

// Registra en el historial y envía los correos de confirmación de un
// CARRITO completo (uno o varios artículos, de cualquier combinación de
// producto/servicio/clase) pagado con PayPal desde el carrito flotante.
// Reutiliza exactamente el mismo criterio de tipo (isClass tiene prioridad
// sobre isService) que ya usa pages/api/checkout.js para no tratar una
// clase con plan como si fuera un servicio.
async function handleCarritoPaypal(req, res, { items, userId, userEmail, payerEmail, payerName, paypalOrderId }) {
  try {
    const enrichedCart = await Promise.all(
      items.map(async (item) => {
        const cleanId = extractRealId(item.id);
        const isClassItem = Boolean(item.isClass);
        const isServiceItem = !isClassItem && Boolean(item.isService);
        const isProductItem = !isClassItem && !isServiceItem;
        const tipo = isClassItem ? 'clase' : (isServiceItem ? 'servicio' : 'producto');
        const tabla = TABLE_BY_TIPO[tipo];

        let nombreResuelto = item.title || item.name || item.nombre || '';
        let imagen = item.image_url || item.imagen_url || null;
        let enlaceDescarga = item.file_url || item.drive_url || item.driveUrl || item.link || '';

        if (cleanId) {
          const { data: dbItem } = await supabase.from(tabla).select('*').eq('id', cleanId).single();
          if (dbItem) {
            if (!imagen) imagen = dbItem.image_url || dbItem.imagen_url || null;
            if (isProductItem && !enlaceDescarga) {
              enlaceDescarga = dbItem.file_url || dbItem.drive_url || dbItem.driveUrl || dbItem.download_url || dbItem.link || '';
            }
          }
        }

        if (!nombreResuelto) {
          nombreResuelto = tipo === 'servicio' ? 'Servicio Digital' : tipo === 'clase' ? 'Clase Digital' : 'Producto Digital';
        }

        const precioCents = typeof item.price_cents === 'number'
          ? item.price_cents
          : (item.price ? Math.round(item.price * 100) : 0);

        return {
          title: nombreResuelto,
          type: tipo,
          quantity: item.quantity || 1,
          price_cents: precioCents,
          currency: (item.currency || item.moneda || 'eur').toLowerCase(),
          image_url: imagen,
          file_url: enlaceDescarga,
        };
      })
    );

    const amount = enrichedCart.reduce((acc, i) => acc + (i.price_cents / 100) * i.quantity, 0);
    const nombrePedido = enrichedCart.map((i) => i.title).join(' + ');

    let resolvedUserId = userId || null;
    const emailParaBuscar = userEmail || payerEmail || null;

    if (!resolvedUserId && emailParaBuscar) {
      try {
        const { data: foundId } = await supabase.rpc('get_user_id_by_email', {
          email_input: String(emailParaBuscar).trim(),
        });
        if (foundId) resolvedUserId = foundId;
      } catch (err) {
        console.error('registrar-pago-paypal (carrito): error buscando usuario por email vía RPC:', err);
      }
    }

    if (resolvedUserId) {
      const { error: dbError } = await supabase.from('purchases').insert([
        {
          user_id: resolvedUserId,
          amount,
          plan_name: nombrePedido,
          items: enrichedCart.map((i) => ({
            name: i.title,
            type: i.type,
            quantity: i.quantity,
            price_cents: i.price_cents,
            currency: i.currency,
            image_url: i.image_url,
          })),
        },
      ]);
      if (dbError) {
        console.error('registrar-pago-paypal (carrito): error guardando en Supabase:', dbError.message);
      }
    } else {
      console.warn('registrar-pago-paypal (carrito): pago de PayPal sin usuario identificado, no se guarda en el historial. Email recibido:', emailParaBuscar);
    }

    // Correos de confirmación: mismo formato de línea por artículo que usa
    // pages/api/enviar-pedido.js para un carrito pagado con Stripe.
    const resendApiKey = process.env.RESEND_API_KEY;
    const nombreCliente = payerName || (emailParaBuscar ? emailParaBuscar.split('@')[0] : 'Cliente');
    const destinoEmail = emailParaBuscar;

    const itemsParaEmail = [...enrichedCart].sort((a, b) => {
      const aEsDescarga = a.type === 'producto' && a.file_url ? 0 : 1;
      const bEsDescarga = b.type === 'producto' && b.file_url ? 0 : 1;
      return aEsDescarga - bEsDescarga;
    });

    const itemsList = itemsParaEmail.map((item) => {
      if (item.type === 'servicio' || item.type === 'clase') {
        const etiqueta = item.type === 'clase' ? 'Clase' : 'Servicio';
        return `<li style="margin-bottom:20px;"><strong style="font-size:16px;color:#ffffff;">${item.title} <span style="color:#aaaaaa;font-weight:normal;">(${etiqueta})</span></strong><br/><span style="color:#cccccc;font-size:13px;">Nos pondremos en contacto contigo o gestionaremos tu briefing.</span></li>`;
      } else if (item.file_url) {
        return `<li style="margin-bottom:20px;"><strong style="font-size:16px;color:#ffffff;">${item.title} <span style="color:#aaaaaa;font-weight:normal;">(Tienda)</span></strong><br/><a href="${item.file_url}" target="_blank" style="${btnStyle}">Descargar / Acceder</a></li>`;
      }
      return `<li style="margin-bottom:20px;"><strong style="font-size:16px;color:#ffffff;">${item.title}</strong><br/><span style="color:#cccccc;font-size:13px;">Pedido registrado correctamente.</span></li>`;
    });

    const linksHtml = `<ul style="list-style:none;padding:0;margin-top:15px;">${itemsList.join('')}</ul>`;
    const linksText = itemsParaEmail.map((i) => `${i.title}: ${i.file_url || i.type}`).join(' | ');

    if (resendApiKey) {
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
            subject: `🚨 NUEVO PAGO RECIBIDO (PayPal): ${nombreCliente}`,
            html: `
              <h2>¡Nuevo pago completado con PayPal!</h2>
              <p><strong>Cliente:</strong> ${nombreCliente}</p>
              <p><strong>Email:</strong> ${destinoEmail || 'No disponible'}</p>
              <p><strong>Total pagado:</strong> ${amount} €</p>
              <p><strong>Artículos:</strong> ${linksText}</p>
              ${paypalOrderId ? `<p><strong>ID de orden PayPal:</strong> ${paypalOrderId}</p>` : ''}
            `,
          }),
        });

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
              <p style="color:#dddddd;">Aquí tienes el detalle de tu pedido:</p>
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
              subject: 'Tu pedido en The Lab - Confirmación',
              html: fullEmailHtml,
            }),
          });
        }
      } catch (emailError) {
        console.error('registrar-pago-paypal (carrito): error enviando correos con Resend:', emailError);
      }
    } else {
      console.error('registrar-pago-paypal (carrito): falta RESEND_API_KEY en Vercel, no se enviaron correos.');
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('registrar-pago-paypal (carrito): error inesperado:', err);
    return res.status(500).json({ error: 'Error al registrar el pago de PayPal del carrito' });
  }
}

// Registra en el historial y envía los correos de confirmación de un mes
// de suscripción del área de clientes pagado con PayPal. La activación del
// acceso (profiles.is_subscribed) NO se hace aquí: pages/area-cliente.js ya
// la hace antes, con la sesión del propio cliente (igual que pages/gracias.js
// hace tras un pago con Stripe), porque esa función usa el usuario que ha
// iniciado sesión y aquí solo tenemos la Service Role Key.
async function handleSuscripcionPaypal(req, res, { amountCents, userId, userEmail, payerEmail, payerName, paypalOrderId }) {
  try {
    const amount = typeof amountCents === 'number' ? amountCents / 100 : 0;
    const nombreItem = 'Suscripción Área de Clientes';

    let resolvedUserId = userId || null;
    const emailParaBuscar = userEmail || payerEmail || null;

    if (!resolvedUserId && emailParaBuscar) {
      try {
        const { data: foundId } = await supabase.rpc('get_user_id_by_email', {
          email_input: String(emailParaBuscar).trim(),
        });
        if (foundId) resolvedUserId = foundId;
      } catch (err) {
        console.error('registrar-pago-paypal (suscripción): error buscando usuario por email vía RPC:', err);
      }
    }

    if (resolvedUserId) {
      const { error: dbError } = await supabase.from('purchases').insert([
        {
          user_id: resolvedUserId,
          amount,
          plan_name: nombreItem,
          items: null,
        },
      ]);
      if (dbError) {
        console.error('registrar-pago-paypal (suscripción): error guardando en Supabase:', dbError.message);
      }
    } else {
      console.warn('registrar-pago-paypal (suscripción): pago de PayPal sin usuario identificado, no se guarda en el historial. Email recibido:', emailParaBuscar);
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    const nombreCliente = payerName || (emailParaBuscar ? emailParaBuscar.split('@')[0] : 'Cliente');
    const destinoEmail = emailParaBuscar;

    if (resendApiKey) {
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
            subject: `🚨 NUEVO PAGO RECIBIDO (PayPal): ${nombreCliente}`,
            html: `
              <h2>¡Nuevo mes de suscripción pagado con PayPal!</h2>
              <p><strong>Cliente:</strong> ${nombreCliente}</p>
              <p><strong>Email:</strong> ${destinoEmail || 'No disponible'}</p>
              <p><strong>Total pagado:</strong> ${amount} €</p>
              <p style="color:#ff9900;"><strong>OJO:</strong> este pago NO se renueva solo — solo Stripe hace renovación automática.</p>
              ${paypalOrderId ? `<p><strong>ID de orden PayPal:</strong> ${paypalOrderId}</p>` : ''}
            `,
          }),
        });

        if (destinoEmail) {
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
              subject: 'Tu suscripción en The Lab - Confirmación',
              html: `
                <!DOCTYPE html>
                <html>
                <head>
                  <meta name="color-scheme" content="light dark">
                  <meta name="supported-color-schemes" content="light dark">
                </head>
                <body style="background-color:#0d0d0d; color:#ffffff; font-family: Arial, sans-serif; padding:20px;">
                  <h2 style="color:#ffffff;">¡Gracias, ${nombreCliente}!</h2>
                  <p style="color:#dddddd;">Tu pago con PayPal se ha procesado correctamente y ya tienes acceso al Área de Clientes durante este mes.</p>
                  <p style="color:#dddddd;">Este pago no se renueva automáticamente: el mes que viene tendrás que volver a pulsar "Suscribirse Ahora" si quieres seguir con acceso.</p>
                </body>
                </html>
              `,
            }),
          });
        }
      } catch (emailError) {
        console.error('registrar-pago-paypal (suscripción): error enviando correos con Resend:', emailError);
      }
    } else {
      console.error('registrar-pago-paypal (suscripción): falta RESEND_API_KEY en Vercel, no se enviaron correos.');
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('registrar-pago-paypal (suscripción): error inesperado:', err);
    return res.status(500).json({ error: 'Error al registrar el pago de PayPal de la suscripción' });
  }
}
