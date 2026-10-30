import { createClient } from '@supabase/supabase-js';
import { prepararCorreo } from '../../lib/correos';
import { aplicarOferta, leerOfertaSuscripcion, precioSuscripcion } from '../../lib/ofertas';
import { partirIdCarrito, buscarPlan, precioCentimos, nombreConPlan } from '../../lib/precios';
import { paypalConfigurado, verificarPedidoPaypal } from '../../lib/paypal';
import { finTrasMesPaypal, suscripcionActiva, precioRenovacion, leerCambioPrecio } from '../../lib/suscripcion';
import { enlaceDescargaProducto } from '../../lib/descargas';

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

// Comprueba con PayPal que el pedido existe, está cobrado y se ha pagado lo
// que vale según la base de datos (lib/paypal.js), y que no se había
// registrado ya. Devuelve true si se puede seguir; si no, ya ha respondido al
// navegador y ha avisado al admin. Si la clave de PayPal aún no está puesta
// en Vercel, se sigue como antes (sin comprobar) y se deja aviso en el log.
async function pagoComprobado(res, paypalOrderId, esperadoCents, resumen) {
  if (!paypalConfigurado()) {
    console.warn('registrar-pago-paypal: falta PAYPAL_CLIENT_SECRET en Vercel; el pago NO se ha comprobado con PayPal.');
    return true;
  }

  const { data: yaRegistrado } = await supabase
    .from('purchases')
    .select('id')
    .eq('paypal_order_id', String(paypalOrderId || ''))
    .limit(1);
  if (Array.isArray(yaRegistrado) && yaRegistrado.length > 0) {
    res.status(409).json({ error: 'Este pago ya estaba registrado.' });
    return false;
  }

  const r = typeof esperadoCents === 'number'
    ? await verificarPedidoPaypal(paypalOrderId, esperadoCents)
    : { ok: false, motivo: 'Algún artículo o plan ya no existe en la tienda, no se puede calcular su precio.' };
  if (r.ok) return true;

  console.error('registrar-pago-paypal: pago NO verificado:', r.motivo, resumen);
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(prepararCorreo({
          from: 'The Lab System <pedidos@hottieprodthis.com>',
          to: ['pedidos.thelab@gmail.com'],
          subject: '⚠️ PAGO DE PAYPAL SIN VERIFICAR — revisar',
          html: `
            <h2>Un pago de PayPal no ha pasado la comprobación</h2>
            <p><strong>Motivo:</strong> ${r.motivo}</p>
            <p><strong>Pedido:</strong> ${resumen}</p>
            <p>No se ha guardado la compra ni se ha enviado nada al cliente. Revísalo en tu cuenta de PayPal y, si el pago es correcto, atiéndelo a mano (o devuélvelo).</p>
          `,
        })),
      });
    } catch (e) {
      console.error('registrar-pago-paypal: no se pudo avisar al admin:', e);
    }
  }
  res.status(402).json({ error: 'Hemos recibido tu pago, pero tenemos que revisarlo. Te escribiremos en breve a tu email.' });
  return false;
}

// Campo extra para la compra: el número de pedido de PayPal (para no
// registrar dos veces el mismo pago). Solo cuando la comprobación está activa.
function campoPedidoPaypal(paypalOrderId) {
  return paypalConfigurado() && paypalOrderId ? { paypal_order_id: String(paypalOrderId) } : {};
}

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
    // Precio real según la base de datos (plan elegido y oferta en vigor). El
    // que manda el navegador (amountCents) solo se usa si no se puede calcular
    // y la comprobación con PayPal no está activa.
    const itemConOferta = aplicarOferta(item);
    const planElegido = buscarPlan(itemConOferta, { planName });
    const precioServidor = planElegido === undefined ? null : precioCentimos(itemConOferta, planElegido);
    const precioCents = precioServidor ?? (typeof amountCents === 'number' ? amountCents : null);

    if (!(await pagoComprobado(res, paypalOrderId, precioServidor, `${nombreItem} · pedido PayPal ${paypalOrderId || '—'} · ${userEmail || payerEmail || 'sin email'}`))) {
      return;
    }
    const moneda = item.currency || item.moneda || 'eur';
    const imagen = item.image_url || item.imagen_url || null;
    const enlaceDescarga = tipoNormalizado === 'producto' ? await enlaceDescargaProducto(supabase, item.id) : '';

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

    // 3. Guardamos en el historial del área de clientes. Si quien paga no
    // tiene cuenta, se guarda igual (user_id vacío + su email) para que gaste
    // cupo y salga en las estadísticas del admin.
    if (resolvedUserId || emailParaBuscar) {
      const { error: dbError } = await supabase.from('purchases').insert([
        {
          user_id: resolvedUserId,
          ...(resolvedUserId ? {} : { email: String(emailParaBuscar).trim() }),
          ...campoPedidoPaypal(paypalOrderId),
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
          body: JSON.stringify(prepararCorreo({
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
          })),
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
            body: JSON.stringify(prepararCorreo({
              from: 'The Lab <pedidos@hottieprodthis.com>',
              reply_to: 'pedidos.thelab@gmail.com',
              to: [destinoEmail],
              subject: 'Tu pedido en The Lab - Acceso a tus artículos',
              html: fullEmailHtml,
            })),
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
        // El enlace de descarga nunca se toma del navegador: sale de product_files.
        let enlaceDescarga = '';
        // Precio real según la base de datos (plan y oferta incluidos).
        let precioServidor = null;

        if (cleanId) {
          const { data: dbItem } = await supabase.from(tabla).select('*').eq('id', cleanId).single();
          if (dbItem) {
            const filaConOferta = aplicarOferta(dbItem);
            const plan = buscarPlan(filaConOferta, { planSlug: partirIdCarrito(item.id).planSlug });
            if (plan !== undefined) {
              precioServidor = precioCentimos(filaConOferta, plan);
              nombreResuelto = nombreConPlan(dbItem, plan) || nombreResuelto;
            }
            if (!imagen) imagen = dbItem.image_url || dbItem.imagen_url || null;
            if (isProductItem) {
              enlaceDescarga = await enlaceDescargaProducto(supabase, cleanId);
            }
          }
        }

        if (!nombreResuelto) {
          nombreResuelto = tipo === 'servicio' ? 'Servicio Digital' : tipo === 'clase' ? 'Clase Digital' : 'Producto Digital';
        }

        const precioCents = precioServidor ?? (typeof item.price_cents === 'number'
          ? item.price_cents
          : (item.price ? Math.round(item.price * 100) : 0));

        return {
          title: nombreResuelto,
          type: tipo,
          precioServidor,
          quantity: Math.max(1, Math.floor(Number(item.quantity)) || 1),
          price_cents: precioCents,
          currency: (item.currency || item.moneda || 'eur').toLowerCase(),
          image_url: imagen,
          file_url: enlaceDescarga,
        };
      })
    );

    const amount = enrichedCart.reduce((acc, i) => acc + (i.price_cents / 100) * i.quantity, 0);
    const nombrePedido = enrichedCart.map((i) => i.title).join(' + ');

    const esperadoCents = enrichedCart.some((i) => i.precioServidor === null)
      ? null
      : enrichedCart.reduce((acc, i) => acc + i.precioServidor * i.quantity, 0);
    if (!(await pagoComprobado(res, paypalOrderId, esperadoCents, `${nombrePedido} · pedido PayPal ${paypalOrderId || '—'} · ${userEmail || payerEmail || 'sin email'}`))) {
      return;
    }

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

    // Sin cuenta: se guarda igual (user_id vacío + email), como arriba.
    if (resolvedUserId || emailParaBuscar) {
      const { error: dbError } = await supabase.from('purchases').insert([
        {
          user_id: resolvedUserId,
          ...(resolvedUserId ? {} : { email: String(emailParaBuscar).trim() }),
          ...campoPedidoPaypal(paypalOrderId),
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
          body: JSON.stringify(prepararCorreo({
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
          })),
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
            body: JSON.stringify(prepararCorreo({
              from: 'The Lab <pedidos@hottieprodthis.com>',
              reply_to: 'pedidos.thelab@gmail.com',
              to: [destinoEmail],
              subject: 'Tu pedido en The Lab - Confirmación',
              html: fullEmailHtml,
            })),
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
// de suscripción del área de clientes pagado con PayPal, y activa el acceso
// (profiles.is_subscribed) para el usuario de la sesión, después de
// comprobar el pago con PayPal.
async function handleSuscripcionPaypal(req, res, { amountCents, userId, userEmail, payerEmail, payerName, paypalOrderId }) {
  try {
    const nombreItem = 'Suscripción Área de Clientes';

    // Quién se suscribe sale de su SESIÓN (cabecera Authorization), no de lo
    // que mande el navegador en el cuerpo.
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    let usuarioSesion = null;
    if (token) {
      const { data: userData } = await supabase.auth.getUser(token);
      usuarioSesion = userData?.user || null;
    }
    if (!usuarioSesion) {
      return res.status(401).json({ error: 'Tienes que iniciar sesión para activar la suscripción.' });
    }

    // Precio real: el de los ajustes del admin con su oferta del primer mes.
    // Si ya está suscrito y el admin ha subido el precio, durante los 30 días
    // de aviso renueva al precio anterior (lib/suscripcion.js).
    const { data: ajustePrecio } = await supabase.from('settings').select('value').eq('key', 'subscription_price').maybeSingle();
    const { data: ajusteOferta } = await supabase.from('settings').select('value').eq('key', 'subscription_offer').maybeSingle();
    const { data: ajusteCambio } = await supabase.from('settings').select('value').eq('key', 'subscription_price_change').maybeSingle();
    const { data: perfilActual } = await supabase
      .from('profiles')
      .select('is_subscribed, subscribed_until')
      .eq('id', usuarioSesion.id)
      .maybeSingle();
    const precioNormal = Math.round(Number(ajustePrecio?.value) * 100);
    const precioBase = Number.isFinite(precioNormal) && precioNormal > 0 ? precioNormal : 799;
    const esperadoCents = precioSuscripcion(
      suscripcionActiva(perfilActual) ? precioRenovacion(precioBase, leerCambioPrecio(ajusteCambio?.value)) : precioBase,
      leerOfertaSuscripcion(ajusteOferta?.value)
    ).cents;

    if (!(await pagoComprobado(res, paypalOrderId, esperadoCents, `${nombreItem} · pedido PayPal ${paypalOrderId || '—'} · ${usuarioSesion.email}`))) {
      return;
    }

    // Pago comprobado: se activa el acceso desde el servidor (antes lo hacía
    // el navegador con la función activar_mi_suscripcion, sin comprobar nada)
    // y dura 1 mes; si aún le quedaban días, el mes se suma al final.
    const nuevoFin = finTrasMesPaypal(perfilActual?.subscribed_until);
    const { error: subError } = await supabase
      .from('profiles')
      .upsert(
        { id: usuarioSesion.id, email: usuarioSesion.email, is_subscribed: true, subscribed_until: nuevoFin.toISOString() },
        { onConflict: 'id' }
      );
    if (subError) {
      console.error('registrar-pago-paypal (suscripción): no se pudo activar el acceso:', subError.message);
      return res.status(500).json({ error: 'El pago se ha realizado, pero hubo un problema activando el acceso. Escríbenos y lo resolvemos.' });
    }

    const amount = esperadoCents / 100;
    let resolvedUserId = usuarioSesion.id;
    const emailParaBuscar = usuarioSesion.email || userEmail || payerEmail || null;

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
          ...campoPedidoPaypal(paypalOrderId),
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
          body: JSON.stringify(prepararCorreo({
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
          })),
        });

        if (destinoEmail) {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(prepararCorreo({
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
                  <p style="color:#dddddd;">Tu pago con PayPal se ha procesado correctamente y ya tienes acceso al Área de Clientes hasta el ${nuevoFin.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Madrid' })}.</p>
                  <p style="color:#dddddd;">Este pago no se renueva automáticamente: antes de esa fecha tendrás que volver a pulsar "Suscribirse" en tu área si quieres seguir con acceso (el mes nuevo se suma al que te queda).</p>
                </body>
                </html>
              `,
            })),
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
