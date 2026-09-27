import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20',
});

// Inicializamos Supabase con la Service Role Key para tener permisos completos en backend
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(500).json({
      error: 'Falta configurar STRIPE_SECRET_KEY en las variables de entorno.',
    });
  }

  const { productId, isService, isSubscription, planName, customPriceCents, items, returnUrl, userId: bodyUserId, userEmail, clientName } = req.body;

  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `https://${req.headers.host}`;
    const cancelUrl = returnUrl || req.headers.referer || siteUrl;

    // --- DETECCIÓN AUTOMÁTICA Y BLINDADA DEL USUARIO ---
    let resolvedUserId = bodyUserId;

    if (!resolvedUserId) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (user && !error) {
          resolvedUserId = user.id;
        }
      }
    }

    if (!resolvedUserId && req.cookies) {
      const cookieKey = Object.keys(req.cookies).find(k => k.includes('auth-token') || k.includes('supabase'));
      if (cookieKey) {
        try {
          const cookieValue = JSON.parse(req.cookies[cookieKey]);
          const token = Array.isArray(cookieValue) ? cookieValue[0] : cookieValue?.access_token;
          if (token) {
            const { data: { user } } = await supabase.auth.getUser(token);
            if (user) resolvedUserId = user.id;
          }
        } catch (e) {}
      }
    }

    // Salvavidas extra: si aún no tenemos userId pero sí un email, lo buscamos
    // ya aquí (antes servía solo para el tramo gratuito; ahora también hace
    // falta para que las compras de pago con tarjeta/PayPal se asocien bien).
    if (!resolvedUserId && userEmail) {
      try {
        const { data: foundId } = await supabase.rpc('get_user_id_by_email', {
          email_input: String(userEmail).trim(),
        });
        if (foundId) resolvedUserId = foundId;
      } catch (err) {
        console.error('Error buscando usuario por email en checkout:', err);
      }
    }
    // --------------------------------------------------

    let lineItems = [];
    let hasService = false;
    let hasClass = false;
    let hasProduct = false;
    let driveLink = '';
    let metadataPayload = {
      user_id: resolvedUserId || '',
    };
    let checkoutMode = 'payment';
    let totalCents = 0;
    let planNameToSave = 'Compra en tienda';
    let linksHtml = '';
    let linksText = '';
    // Detalle completo (sin límite de tamaño) de los artículos del pedido.
    // Se usa para guardar el desglose real en el historial del área de
    // clientes (tabla purchases, columna items). No depende del límite de
    // 500 caracteres que Stripe impone a los metadatos.
    let itemsForHistory = [];

    const btnStyle = 'background-color:#CCFF00 !important; color:#000000 !important; padding:14px 22px; text-decoration:none; border-radius:6px; display:inline-block; font-weight:900; font-size:14px; text-transform:uppercase; letter-spacing:0.5px; border:none;';

    // 1. SUSCRIPCIÓN
    if (isSubscription) {
      checkoutMode = 'subscription';
      let finalPriceCents = customPriceCents;

      if (!finalPriceCents) {
        const { data: settingData } = await supabase
          .from('settings')
          .select('value')
          .eq('key', 'subscription_price')
          .single();

        finalPriceCents = settingData?.value ? Math.round(Number(settingData.value) * 100) : 799;
      }

      totalCents += finalPriceCents;
      planNameToSave = 'Suscripción Área de Clientes';
      lineItems = [{
        price_data: {
          currency: 'eur',
          product_data: {
            name: planName || 'Suscripción The Lab — Área de Clientes',
            description: 'Acceso mensual exclusivo',
          },
          unit_amount: finalPriceCents,
          recurring: { interval: 'month' },
        },
        quantity: 1,
      }];

      metadataPayload = { ...metadataPayload, type: 'subscription' };
    }
    // 2. CARRITO DE COMPRAS
    else if (items && Array.isArray(items) && items.length > 0) {
      const enrichedCart = await Promise.all(
        items.map(async (item) => {
          let downloadUrl = item.file_url || item.drive_url || item.driveUrl || item.link || '';
          let nameResolved = item.name || item.title || item.nombre || '';
          const cleanId = item.id && String(item.id).includes('-') ? String(item.id).split('-')[0] : item.id;

          let isClassItem = false;
          let isServiceItem = item.isService;

          if (cleanId) {
            let dbItem = null;
            const { data: sData } = await supabase.from('services').select('*').eq('id', cleanId).single();
            if (sData) {
              dbItem = sData;
              isServiceItem = true;
            } else {
              const { data: cData } = await supabase.from('classes').select('*').eq('id', cleanId).single();
              if (cData) {
                dbItem = cData;
                isClassItem = true;
              } else {
                const { data: pData } = await supabase.from('products').select('*').eq('id', cleanId).single();
                if (pData) {
                  dbItem = pData;
                  hasProduct = true;
                }
              }
            }

            if (dbItem) {
              if (!downloadUrl && !isServiceItem && !isClassItem) {
                downloadUrl = dbItem.file_url || dbItem.drive_url || dbItem.driveUrl || dbItem.download_url || dbItem.link || '';
              }
              if (!nameResolved) {
                nameResolved = dbItem.name || dbItem.title || dbItem.nombre || '';
              }
            }
          } else {
            if (item.isService) isServiceItem = true;
            else hasProduct = true;
          }

          if (!nameResolved) nameResolved = isServiceItem ? 'Servicio Digital' : (isClassItem ? 'Clase Digital' : 'Producto Digital');
          if (isServiceItem) hasService = true;
          if (isClassItem) hasClass = true;

          const finalPriceCents = item.price_cents || item.precio_centimos || (item.price ? Math.round(item.price * 100) : 0);
          totalCents += finalPriceCents * (item.quantity || 1);

          return {
            id: item.id,
            title: nameResolved,
            isService: isServiceItem,
            isClass: isClassItem,
            file_url: downloadUrl,
            quantity: item.quantity || 1,
            price_cents: finalPriceCents,
            currency: item.moneda || item.currency || 'eur',
            description: item.description,
            image_url: item.image_url || item.imagen_url
          };
        })
      );

      planNameToSave = enrichedCart.map(i => i.title).join(' + ');

      lineItems = enrichedCart.map((item) => ({
        price_data: {
          currency: item.currency.toLowerCase(),
          product_data: {
            name: item.title,
            description: item.description ? item.description.slice(0, 300) : undefined,
            images: item.image_url ? [item.image_url] : undefined,
          },
          unit_amount: item.price_cents,
        },
        quantity: item.quantity,
      }));

      const itemsList = enrichedCart.map((item) => {
        if (item.isService || item.isClass) {
          return `<li style="margin-bottom: 24px;">
            <strong style="font-size: 16px; color:#ffffff;">${item.title} <span style="color:#aaaaaa; font-weight:normal;">(${item.isClass ? 'Clase' : 'Servicio'})</span></strong><br/>
            <span style="color:#cccccc;font-size:13px;display:block;margin-top:6px;">Nos pondremos en contacto contigo o gestionaremos tu briefing.</span>
          </li>`;
        } else if (item.file_url) {
          return `<li style="margin-bottom: 24px;">
            <strong style="font-size: 16px; color:#ffffff;">${item.title} <span style="color:#aaaaaa; font-weight:normal;">(Tienda)</span></strong><br/>
            <div style="margin-top:10px;">
              <table border="0" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td align="center" bgcolor="#CCFF00" style="border-radius:6px; background-color:#CCFF00;">
                    <a href="${item.file_url}" target="_blank" style="${btnStyle}">
                      Descargar / Acceder
                    </a>
                  </td>
                </tr>
              </table>
            </div>
          </li>`;
        } else {
          return `<li style="margin-bottom: 24px;">
            <strong style="font-size: 16px; color:#ffffff;">${item.title}</strong><br/>
            <span style="color:#cccccc;font-size:13px;display:block;margin-top:6px;">Pedido registrado correctamente.</span>
          </li>`;
        }
      });

      linksHtml = `<ul style="list-style:none;padding:0;margin-top:15px;">${itemsList.join('')}</ul>`;
      linksText = enrichedCart.map(i => `${i.title}: ${i.file_url || 'Servicio/Clase'}`).join(' | ');

      // Tipo real de cada artículo (producto / servicio / clase), en lugar
      // del antiguo booleano "isService" que confundía servicios y clases.
      const compactCartData = enrichedCart.map(i => ({
        title: String(i.title).substring(0, 40),
        type: i.isClass ? 'clase' : (i.isService ? 'servicio' : 'producto'),
        file_url: i.file_url ? String(i.file_url).split('?')[0].substring(0, 100) : '',
        price_cents: i.price_cents,
        currency: i.currency,
        quantity: i.quantity,
        image_url: i.image_url ? String(i.image_url).split('?')[0].substring(0, 120) : '',
      }));

      const jsonCart = JSON.stringify(compactCartData);
      metadataPayload = {
        ...metadataPayload,
        // Si el carrito es tan grande que no cabe en el límite de 500
        // caracteres que impone Stripe para cada valor de metadata,
        // guardamos una versión reducida (sin perder el tipo de artículo,
        // que es lo mínimo que necesita el webhook para no perder el
        // desglose por completo).
        cart_data: jsonCart.length > 500
          ? JSON.stringify([{
              title: 'Pedido Múltiple',
              type: hasService ? 'servicio' : (hasClass ? 'clase' : 'producto'),
              file_url: '',
            }])
          : jsonCart,
      };

      // Detalle completo para el historial (no pasa por Stripe, así que no
      // tiene el límite de 500 caracteres).
      itemsForHistory = enrichedCart.map((i) => ({
        name: i.title,
        type: i.isClass ? 'clase' : (i.isService ? 'servicio' : 'producto'),
        quantity: i.quantity,
        price_cents: i.price_cents,
        currency: i.currency,
        image_url: i.image_url || null,
      }));
    }
    // 3. COMPRA DIRECTA DE UN PRODUCTO AISLADO
    else if (productId) {
      let item = null;

      if (isService) {
        const { data: sData } = await supabase.from('services').select('*').eq('id', productId).single();
        if (sData) { item = sData; hasService = true; }
      }
      if (!item) {
        const { data: cData } = await supabase.from('classes').select('*').eq('id', productId).single();
        if (cData) { item = cData; hasClass = true; }
      }
      if (!item) {
        const { data: pData } = await supabase.from('products').select('*').eq('id', productId).single();
        if (pData) { item = pData; hasProduct = true; }
      }

      if (!item) {
        return res.status(404).json({ error: 'Artículo no encontrado.' });
      }

      const unitAmount = customPriceCents || item.price_cents || item.precio_centimos || (item.price ? Math.round(item.price * 100) : 0);
      totalCents += unitAmount;

      driveLink = item.file_url || item.drive_url || item.driveUrl || item.download_url || item.link || '';

      let nameResolved = item.name || item.title || item.nombre || 'Producto Digital';
      if (planName) nameResolved = `${nameResolved} (${planName})`;
      planNameToSave = nameResolved;

      const itemCurrency = (item.moneda || item.currency || 'eur').toLowerCase();
      const itemImage = item.image_url || item.imagen_url || null;

      lineItems = [{
        price_data: {
          currency: itemCurrency,
          product_data: {
            name: nameResolved,
            description: item.description ? item.description.slice(0, 300) : undefined,
            images: itemImage ? [itemImage] : undefined,
          },
          unit_amount: unitAmount,
        },
        quantity: 1,
      }];

      if (hasService || hasClass) {
        linksHtml = `<p><strong style="font-size:16px; color:#ffffff;">${nameResolved} <span style="color:#aaaaaa; font-weight:normal;">(${hasClass ? 'Clase' : 'Servicio'})</span></strong></p><p style="color:#cccccc;font-size:13px;">Nos pondremos en contacto contigo o gestionaremos tu briefing.</p>`;
        linksText = `${nameResolved} (${hasClass ? 'Clase' : 'Servicio'})`;
      } else if (driveLink) {
        linksHtml = `
          <p><strong style="font-size:16px; color:#ffffff;">${nameResolved} <span style="color:#aaaaaa; font-weight:normal;">(Tienda)</span></strong></p>
          <div style="margin-top:10px;">
            <table border="0" cellpadding="0" cellspacing="0" role="presentation">
              <tr>
                <td align="center" bgcolor="#CCFF00" style="border-radius:6px; background-color:#CCFF00;">
                  <a href="${driveLink}" target="_blank" style="${btnStyle}">
                    Descargar / Acceder
                  </a>
                </td>
              </tr>
            </table>
          </div>
        `;
        linksText = `${nameResolved}: ${driveLink}`;
      } else {
        linksHtml = `<p style="color:#cccccc;">Pedido gratuito registrado correctamente.</p>`;
        linksText = nameResolved;
      }

      const singleItemType = hasClass ? 'clase' : (hasService ? 'servicio' : 'producto');

      metadataPayload = {
        ...metadataPayload,
        product_id: String(item.id),
        product_name: String(nameResolved).substring(0, 50),
        is_service: (hasService || hasClass) ? 'true' : 'false',
        file_url: String(driveLink).split('?')[0].substring(0, 150),
        // Igual que en el carrito: un array de un solo elemento, para que
        // el webhook use SIEMPRE el mismo camino (metadata.cart_data) sin
        // importar si la compra viene de un solo artículo o de varios.
        cart_data: JSON.stringify([{
          title: String(nameResolved).substring(0, 40),
          type: singleItemType,
          file_url: driveLink ? String(driveLink).split('?')[0].substring(0, 100) : '',
          price_cents: unitAmount,
          currency: itemCurrency,
          quantity: 1,
          image_url: itemImage ? String(itemImage).split('?')[0].substring(0, 120) : '',
        }]),
      };

      itemsForHistory = [{
        name: nameResolved,
        type: singleItemType,
        quantity: 1,
        price_cents: unitAmount,
        currency: itemCurrency,
        image_url: itemImage,
      }];
    } else {
      return res.status(400).json({ error: 'No se enviaron artículos para la compra.' });
    }

    if (totalCents > 0 && totalCents < 50) {
      return res.status(400).json({ error: 'Stripe requiere un importe mínimo de 0.50€' });
    }

    // --- DETERMINAR EL TIPO EXACTO PARA LA PÁGINA DE GRACIAS / BRIEFING ---
    // Construimos el tipo en un orden fijo (producto, servicio, clase) para
    // que el resultado sea siempre el mismo sin importar en qué orden se
    // añadieron los artículos al carrito (Producto+Servicio y
    // Servicio+Producto deben dar exactamente el mismo resultado).
    const totalCategories = (hasService ? 1 : 0) + (hasClass ? 1 : 0) + (hasProduct ? 1 : 0);
    const tipoParts = [];
    if (hasProduct) tipoParts.push('producto');
    if (hasService) tipoParts.push('servicio');
    if (hasClass) tipoParts.push('clase');
    const tipoQuery = tipoParts.length > 0 ? tipoParts.join('_') : 'producto';

    const needsBriefing = hasService || hasClass;
    const isMixedCategories = totalCategories > 1;

    let successUrl = `${siteUrl}/gracias?tipo=${tipoQuery}`;
    if (isSubscription) {
      // Suscripción: comportamiento intacto.
      successUrl = `${siteUrl}/gracias?tipo=suscripcion&session_id={CHECKOUT_SESSION_ID}`;
    } else if (isMixedCategories) {
      // Pedido con 2 o más tipos distintos (por ejemplo Producto+Servicio,
      // Servicio+Clase o Producto+Servicio+Clase): todos los briefings que
      // hagan falta (servicio y/o clase) se muestran juntos en la misma
      // página. Los productos nunca generan briefing.
      successUrl = `${siteUrl}/briefing?tipo=${tipoQuery}&session_id={CHECKOUT_SESSION_ID}`;
    } else if (hasService) {
      // Comportamiento exactamente igual que antes: compra de un único
      // servicio (sola o con varias unidades del mismo servicio).
      successUrl = `${siteUrl}/servicios/briefing?tipo=${tipoQuery}&session_id={CHECKOUT_SESSION_ID}`;
    } else if (hasClass) {
      // Comportamiento exactamente igual que antes: compra de una única
      // clase.
      successUrl = `${siteUrl}/clases/briefing?tipo=${tipoQuery}&session_id={CHECKOUT_SESSION_ID}`;
    }
    // Si solo hay producto(s), needsBriefing es false y successUrl se queda
    // en /gracias?tipo=producto (comportamiento intacto, sin briefing).

    // --- SI EL TOTAL ES 0.00€ (GUARDADO EN SUPABASE + ENVÍO DE CORREOS RESEND) ---
    if (totalCents === 0 && checkoutMode !== 'subscription') {
      // Salvavidas extra por si viene autenticado por cabecera
      if (!resolvedUserId && req.headers.authorization) {
        try {
          const token = req.headers.authorization.split(' ')[1];
          const { data: { user } } = await supabase.auth.getUser(token);
          if (user) resolvedUserId = user.id;
        } catch (e) {}
      }

      let destinoEmail = userEmail;
      if (!destinoEmail && resolvedUserId) {
        try {
          const { data: userData } = await supabase.auth.admin.getUserById(resolvedUserId);
          if (userData?.user?.email) destinoEmail = userData.user.email;
        } catch (e) {}
      }

      if (resolvedUserId) {
        try {
          const { error: dbError } = await supabase.from('purchases').insert([
            {
              user_id: resolvedUserId,
              amount: 0,
              plan_name: planNameToSave,
              items: itemsForHistory.length > 0 ? itemsForHistory : null,
            }
          ]);
          if (dbError) {
            console.error('Error guardando compra de 0€ en Supabase:', dbError.message);
          }
        } catch (e) {
          console.error('Error guardando compra de 0€ en Supabase:', e);
        }
      } else {
        console.warn('AVISO: pedido gratuito sin usuario identificado, no se guarda en el historial.');
      }

      const resendApiKey = process.env.RESEND_API_KEY;
      const nombreClienteReal = clientName || (destinoEmail ? destinoEmail.split('@')[0] : 'Cliente');

      if (resendApiKey && destinoEmail) {
        try {
          // 1. Notificación para el admin
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'The Lab System <pedidos@hottieprodthis.com>',
              to: ['pedidos.thelab@gmail.com'],
              subject: `🚨 NUEVO PEDIDO / RESERVA GRATUITA (0€): ${nombreClienteReal}`,
              html: `
                <h2>¡Nuevo pedido o reserva gratuita registrada!</h2>
                <p><strong>Cliente:</strong> ${nombreClienteReal}</p>
                <p><strong>Email:</strong> ${destinoEmail}</p>
                <p><strong>Total:</strong> 0.00 €</p>
                <p><strong>Concepto:</strong> ${linksText || planNameToSave}</p>
              `,
            }),
          });

          // 2. Correo de confirmación para el cliente
          const fullEmailHtml = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta name="color-scheme" content="light dark">
              <meta name="supported-color-schemes" content="light dark">
            </head>
            <body style="background-color:#0d0d0d; color:#ffffff; font-family: Arial, sans-serif; padding:20px;">
              <h2 style="color:#ffffff;">¡Gracias por tu solicitud, ${nombreClienteReal}!</h2>
              <p style="color:#dddddd;">Tu pedido o reserva gratuita se ha registrado correctamente.</p>
              <p style="color:#dddddd;">Aquí tienes los detalles y accesos correspondientes:</p>
              ${linksHtml || `<p style="color:#dddddd;">${planNameToSave}</p>`}
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
              subject: 'Tu solicitud en The Lab - Confirmación y Accesos',
              html: fullEmailHtml,
            }),
          });
        } catch (emailError) {
          console.error('Error enviando correos de 0€ con Resend:', emailError);
        }
      }

      return res.status(200).json({ url: successUrl, freeCheckout: true });
    }

    const session = await stripe.checkout.sessions.create({
      mode: checkoutMode,
      payment_method_types: isSubscription ? ['card'] : ['card', 'klarna', 'link', 'bizum'],
      allow_promotion_codes: true,
      line_items: lineItems,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: metadataPayload,
      client_reference_id: resolvedUserId || undefined,
      // Precargamos el email cuando lo conocemos: ayuda a que el webhook
      // (que recibe el email definitivo de Stripe) identifique siempre al
      // mismo usuario, incluso si en el formulario de Stripe se teclea un
      // correo distinto al de la cuenta.
      customer_email: userEmail || undefined,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Error Stripe Checkout:', err);
    return res.status(500).json({ error: 'No se ha podido crear el pago con Stripe' });
  }
}
