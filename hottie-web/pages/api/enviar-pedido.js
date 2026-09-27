import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// 1. Inicializamos Supabase con la Service Role Key para evitar bloqueos de RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

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

// Resuelve el "tipo" real de un artículo del carrito, tanto si viene con el
// campo nuevo (type: 'producto'|'servicio'|'clase') como si viene de una
// sesión de Stripe creada justo antes de este despliegue (con el booleano
// antiguo isService/isClass).
function resolveItemType(item) {
  if (item.type === 'servicio' || item.type === 'clase' || item.type === 'producto') {
    return item.type;
  }
  if (item.isClass) return 'clase';
  if (item.isService) return 'servicio';
  return 'producto';
}

const TABLA_POR_TIPO = { producto: 'products', servicio: 'services', clase: 'classes' };

// Acepta tanto el formato NUEVO y compacto que manda checkout.js
// ({i: id, y: tipo, t: título, p: precio, c: moneda, q: cantidad} — se
// llama así de corto para que quepan más artículos en el límite de 500
// caracteres que impone Stripe en cada campo de metadata) como el formato
// más largo de sesiones que ya estuvieran en curso justo cuando se
// desplegó este cambio ({title,type,file_url,price_cents,currency,
// quantity,image_url} o el aún más antiguo con isService/isClass).
function normalizarArticuloCarrito(raw) {
  if (raw && (raw.i !== undefined || raw.y !== undefined)) {
    return {
      id: raw.i || null,
      type: raw.y || 'producto',
      title: raw.t || '',
      price_cents: typeof raw.p === 'number' ? raw.p : null,
      currency: raw.c || 'eur',
      quantity: raw.q || 1,
      file_url: '',
      image_url: '',
    };
  }
  return {
    id: raw.id || null,
    type: resolveItemType(raw),
    title: raw.title || raw.name || raw.nombre || '',
    price_cents: typeof raw.price_cents === 'number' ? raw.price_cents : null,
    currency: raw.currency || 'eur',
    quantity: raw.quantity || 1,
    file_url: raw.file_url || raw.driveUrl || raw.drive_url || raw.link || '',
    image_url: raw.image_url || '',
  };
}

// Rellena imagen y (para productos) enlace de descarga leyéndolos siempre
// FRESCOS de la base de datos real, en vez de depender de lo que venga en
// los metadatos de Stripe (que ahora, a propósito, no los lleva porque no
// caben). Así el correo y el historial siempre tienen el enlace/imagen
// actuales, aunque el admin los cambie después de la compra.
async function enriquecerArticuloCarrito(item) {
  if (!item.id) return item;
  const tabla = TABLA_POR_TIPO[item.type] || 'products';
  try {
    const { data } = await supabase.from(tabla).select('*').eq('id', item.id).single();
    if (data) {
      return {
        ...item,
        title: item.title || data.name || data.title || data.nombre || '',
        image_url: item.image_url || data.image_url || data.imagen_url || '',
        file_url: item.type === 'producto'
          ? (item.file_url || data.file_url || data.drive_url || data.driveUrl || data.download_url || data.link || '')
          : item.file_url,
      };
    }
  } catch (e) {
    console.error('No se pudo releer el artículo desde la base de datos:', tabla, item.id, e.message);
  }
  return item;
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
    const emailCliente = session.customer_details?.email || session.customer_email || session.metadata?.customer_email;
    const nombreCliente = session.customer_details?.name || 'Cliente';
    const metadata = session.metadata || {};

    console.log('--- WEBHOOK STRIPE RECIBIDO ---');
    console.log('Email cliente:', emailCliente);
    console.log('Metadata recibida:', metadata);

    // 2. Extraemos los datos exactos que necesitamos para el historial
    let userId = session.client_reference_id; // ID que enviamos desde checkout.js
    const totalAmount = session.amount_total ? session.amount_total / 100 : 0; // Pasamos los céntimos a euros
    let planNameToSave = 'Compra en tienda';

    let linksHtml = '';
    let linksText = '';
    // Desglose estructurado para guardar en purchases.items (historial
    // desplegable del área de clientes). Se rellena a partir de
    // metadata.cart_data, que desde este cambio SIEMPRE viene presente
    // (tanto si la compra fue de un solo artículo como de varios).
    let itemsForHistory = [];

    const btnStyle = 'background-color:#CCFF00 !important; color:#000000 !important; padding:14px 22px; text-decoration:none; border-radius:6px; display:inline-block; font-weight:900; font-size:14px; text-transform:uppercase; letter-spacing:0.5px; border:none;';

    // 1. Carrito (uno o varios artículos: producto, servicio y/o clase)
    if (metadata.cart_data) {
      try {
        const rawItems = JSON.parse(metadata.cart_data);
        // Cada artículo se vuelve a consultar en su tabla real (products/
        // services/classes) para traer imagen y enlace de descarga
        // SIEMPRE frescos y correctos, en vez de depender de lo que venga
        // en los metadatos de Stripe (limitados a 500 caracteres, por eso
        // ya no viajan ahí). El nombre/precio/tipo/cantidad sí vienen
        // directos de los metadatos (son los que se cobraron de verdad,
        // incluido el plan elegido si lo tenía).
        const cartItems = await Promise.all(
          rawItems.map((raw) => enriquecerArticuloCarrito(normalizarArticuloCarrito(raw)))
        );

        // Creamos el nombre para el historial (ej: "Pack de Beats + Servicio de Mezcla")
        const itemNames = cartItems.map(i => i.title || 'Artículo').join(' + ');
        planNameToSave = itemNames;

        const itemsList = cartItems.map((item) => {
          let itemTitle = item.title;
          const itemType = item.type;
          if (!itemTitle) {
            itemTitle = itemType === 'servicio' ? 'Servicio Digital' : itemType === 'clase' ? 'Clase Digital' : 'Producto Digital';
          }

          const itemUrl = item.file_url || '';

          if (itemType === 'servicio' || itemType === 'clase') {
            const etiqueta = itemType === 'clase' ? 'Clase' : 'Servicio';
            return `<li style="margin-bottom: 24px;">
              <strong style="font-size: 16px; color:#ffffff;">${itemTitle} <span style="color:#aaaaaa; font-weight:normal;">(${etiqueta})</span></strong><br/>
              <span style="color:#cccccc;font-size:13px;display:block;margin-top:6px;">Nos pondremos en contacto contigo o gestionaremos tu briefing para coordinar ${itemType === 'clase' ? 'la clase' : 'el servicio'}.</span>
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
        linksText = cartItems.map(i => `${i.title}: ${i.file_url || i.type}`).join(' | ');

        itemsForHistory = cartItems.map((i) => ({
          name: i.title || 'Artículo',
          type: i.type,
          quantity: i.quantity || 1,
          price_cents: typeof i.price_cents === 'number' ? i.price_cents : null,
          currency: i.currency || 'eur',
          image_url: i.image_url || null,
        }));
      } catch (e) {
        console.error('Error al parsear cart_data:', e);
      }
    }

    // 2. Compra individual / Directa (fallback para sesiones antiguas sin cart_data)
    if (!linksHtml) {
      const enlaceDrive =
        metadata.driveUrl ||
        metadata.file_url ||
        metadata.fileUrl ||
        metadata.drive_url ||
        metadata.link ||
        '';

      let singleTitle = metadata.product_name;
      if (!singleTitle) {
        singleTitle = metadata.is_service === 'true' ? 'Servicio Digital' : 'Producto Digital';
      }

      // Nombramos la compra para el historial de forma robusta
      if (metadata.type === 'subscription') {
        planNameToSave = 'Suscripción Área de Clientes';
      } else {
        planNameToSave = singleTitle;
      }

      if (metadata.is_service === 'true') {
        linksHtml = `<p><strong style="font-size:16px; color:#ffffff;">${singleTitle} <span style="color:#aaaaaa; font-weight:normal;">(Servicio)</span></strong></p><p style="color:#cccccc;font-size:13px;">Nos pondremos en contacto contigo para coordinarlo.</p>`;
        linksText = `${singleTitle} (Servicio)`;
        if (metadata.type !== 'subscription') {
          itemsForHistory = [{ name: singleTitle, type: 'servicio', quantity: 1, price_cents: null, currency: 'eur', image_url: null }];
        }
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
        if (metadata.type !== 'subscription') {
          itemsForHistory = [{ name: singleTitle, type: 'producto', quantity: 1, price_cents: null, currency: 'eur', image_url: null }];
        }
      } else if (metadata.type === 'subscription') {
        linksHtml = `<p style="color:#cccccc;">Tu suscripción se ha activado correctamente.</p>`;
        linksText = planNameToSave;
      } else {
        linksHtml = `<p style="color:#ff5555;">Ha habido un problema cargando tu enlace de descarga automático. Por favor responde a este correo para enviártelo manualmente.</p>`;
        linksText = 'Error enlace';
      }
    }

    console.log('Nombre de plan que se guardará:', planNameToSave);
    console.log('UserId inicial recibido de Stripe:', userId);

    // --- SALVAVIDAS INFALIBLE VÍA RPC (RÁPIDO Y LIGERO) ---
    if (!userId && emailCliente) {
      try {
        const { data: foundId } = await supabase.rpc('get_user_id_by_email', {
          email_input: emailCliente.trim()
        });
        if (foundId) {
          userId = foundId;
          console.log('UserId encontrado mediante RPC por email:', userId);
        } else {
          console.warn('RPC no encontró usuario registrado con el email:', emailCliente);
        }
      } catch (err) {
        console.error('Error buscando usuario por email vía RPC:', err);
      }
    }

    // 3. Insertamos el registro de la compra en tu tabla Supabase
    if (userId) {
      try {
        const { error: dbError } = await supabase
          .from('purchases')
          .insert([
            {
              user_id: userId,
              amount: totalAmount,
              plan_name: planNameToSave,
              items: itemsForHistory.length > 0 ? itemsForHistory : null,
            }
          ]);

        if (dbError) {
          console.error('ERROR de Supabase al guardar historial:', dbError.message);
        } else {
          console.log(`¡ÉXITO! Compra de "${planNameToSave}" (${totalAmount}€) guardada para el usuario ${userId}`);
        }
      } catch (e) {
        console.error('Excepción crítica guardando historial en Supabase:', e);
      }
    } else {
      console.error('AVISO: No se pudo asociar la compra a ningún usuario (userId nulo).');
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
            <p><strong>Total pagado:</strong> ${totalAmount} €</p>
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
