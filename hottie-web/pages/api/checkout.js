import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { prepararCorreo } from '../../lib/correos';
import { partirIdCarrito, buscarPlan, precioCentimos, nombreConPlan } from '../../lib/precios';
import { aplicarOferta, leerOfertaSuscripcion, precioSuscripcion } from '../../lib/ofertas';
import { estadoSemana, resumirPedido, comprobarPedido, tipoFormularioServicios } from '../../lib/limiteSemanal';

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
    // Servicios y clases del pedido ({ tipo, id, name, quantity }), para el
    // cupo semanal (más abajo, antes de cobrar).
    const itemsCupo = [];
    let driveLink = '';
    let metadataPayload = {
      user_id: resolvedUserId || '',
    };
    let checkoutMode = 'payment';
    let cuponSuscripcion = null; // cupón de Stripe de la oferta de la suscripción
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
      // El precio se lee SIEMPRE de los ajustes del admin, nunca del
      // navegador (customPriceCents se ignora: el cliente podría cambiarlo).
      const { data: settingData } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'subscription_price')
        .single();

      const precioAjustes = Math.round(Number(settingData?.value) * 100);
      const finalPriceCents = Number.isFinite(precioAjustes) && precioAjustes > 0 ? precioAjustes : 799;

      // Oferta de la suscripción (solo el PRIMER mes, decisión del dueño):
      // el precio mensual sigue siendo el normal y Stripe descuenta la
      // diferencia una sola vez con un cupón.
      const { data: ofertaAjuste } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'subscription_offer')
        .maybeSingle();
      const sub = precioSuscripcion(finalPriceCents, leerOfertaSuscripcion(ofertaAjuste?.value));
      if (sub.oferta) {
        const rebaja = finalPriceCents - sub.cents;
        const idCupon = `oferta-suscripcion-${rebaja}`;
        try {
          try {
            await stripe.coupons.retrieve(idCupon);
          } catch (e) {
            await stripe.coupons.create({
              id: idCupon,
              amount_off: rebaja,
              currency: 'eur',
              duration: 'once',
              name: 'Oferta primer mes',
            });
          }
          cuponSuscripcion = idCupon;
        } catch (e) {
          // Si Stripe falla con el cupón, se cobra el precio normal en vez de
          // dejar al cliente sin poder suscribirse.
          console.error('No se pudo preparar el cupón de la oferta de suscripción:', e?.message || e);
        }
      }

      totalCents += cuponSuscripcion ? sub.cents : finalPriceCents;
      planNameToSave = 'Suscripción Área de Clientes';
      lineItems = [{
        price_data: {
          currency: 'eur',
          product_data: {
            // Nombre fijo (antes venía del navegador).
            name: 'Suscripción Área de Clientes',
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
      // Extrae el UUID real de un id de carrito. Los artículos con plan
      // (servicios/clases comprados desde su ficha con un plan elegido)
      // usan un id compuesto "uuid-nombredelplan" para poder tener varias
      // líneas distintas en el carrito. Antes se intentaba "adivinar" el
      // uuid cortando por el PRIMER guion (String(id).split('-')[0]), pero
      // un UUID ya lleva 4 guiones dentro, así que eso rompía el id y la
      // búsqueda en la base de datos fallaba siempre. Ahora se reconoce el
      // UUID real completo con una expresión regular.
      const extractRealId = (id) => {
        if (!id) return id;
        const match = String(id).match(/^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/);
        return match ? match[1] : String(id);
      };

      const enrichedCart = await Promise.all(
        items.map(async (item) => {
          let downloadUrl = item.file_url || item.drive_url || item.driveUrl || item.link || '';
          let nameResolved = item.name || item.title || item.nombre || '';
          const cleanId = extractRealId(item.id);
          const { planSlug } = partirIdCarrito(item.id);
          // Fila real de la base de datos: de ella sale el precio que se cobra.
          let filaDb = null;

          // Señal principal: lo que el propio carrito ya sabe (isClass/
          // isService se fijan en el navegador en el momento de "Añadir al
          // carrito", donde SÍ se sabe con certeza qué se está comprando).
          // Antes esto se intentaba adivinar solo con una consulta a la
          // base de datos usando el id roto de arriba, así que una clase
          // con plan casi siempre se detectaba como "servicio". Si por
          // compatibilidad llegasen ambos marcados a la vez, "clase" tiene
          // prioridad (igual que ya hace el desplegable del carrito).
          let isClassItem = Boolean(item.isClass);
          let isServiceItem = !isClassItem && Boolean(item.isService);
          let isProductItem = !isClassItem && !isServiceItem;

          if (cleanId) {
            const tabla = isClassItem ? 'classes' : isServiceItem ? 'services' : 'products';
            const { data: dbItem } = await supabase.from(tabla).select('*').eq('id', cleanId).single();

            if (dbItem) {
              filaDb = dbItem;
              if (!downloadUrl && isProductItem) {
                downloadUrl = dbItem.file_url || dbItem.drive_url || dbItem.driveUrl || dbItem.download_url || dbItem.link || '';
              }
              if (!nameResolved) {
                nameResolved = dbItem.name || dbItem.title || dbItem.nombre || '';
              }
            } else if (isProductItem) {
              // Salvavidas SOLO para carritos que ya estuvieran guardados
              // en el navegador de un cliente ANTES de este cambio (sin
              // isClass/isService fiables): probamos las otras dos tablas
              // antes de rendirnos, igual que se hacía antes.
              const { data: sData } = await supabase.from('services').select('*').eq('id', cleanId).single();
              if (sData) {
                filaDb = sData;
                isServiceItem = true;
                isProductItem = false;
                if (!nameResolved) nameResolved = sData.name || sData.title || sData.nombre || '';
              } else {
                const { data: cData } = await supabase.from('classes').select('*').eq('id', cleanId).single();
                if (cData) {
                  filaDb = cData;
                  isClassItem = true;
                  isProductItem = false;
                  if (!nameResolved) nameResolved = cData.name || cData.title || cData.nombre || '';
                }
              }
            }
          }

          // El precio (y el nombre) salen de la base de datos, nunca del
          // navegador. Si el artículo ya no existe, está desactivado o el plan
          // no existe, no se puede cobrar: se avisa al cliente más abajo.
          // Con la oferta ya aplicada si está en vigor (lib/ofertas.js).
          if (filaDb) filaDb = aplicarOferta(filaDb);
          const plan = filaDb ? buscarPlan(filaDb, { planSlug }) : undefined;
          if (!filaDb || filaDb.active === false || plan === undefined) {
            return { invalido: true };
          }
          nameResolved = nombreConPlan(filaDb, plan) || nameResolved;

          if (!nameResolved) nameResolved = isServiceItem ? 'Servicio Digital' : (isClassItem ? 'Clase Digital' : 'Producto Digital');
          if (isServiceItem) hasService = true;
          if (isClassItem) hasClass = true;
          if (isProductItem) hasProduct = true;

          const cantidad = Math.max(1, Math.floor(Number(item.quantity)) || 1);
          const finalPriceCents = precioCentimos(filaDb, plan);
          totalCents += finalPriceCents * cantidad;

          return {
            id: item.id,
            dbId: cleanId,
            title: nameResolved,
            isService: isServiceItem,
            isClass: isClassItem,
            file_url: downloadUrl,
            quantity: cantidad,
            price_cents: finalPriceCents,
            currency: filaDb.currency || filaDb.moneda || item.moneda || item.currency || 'eur',
            description: item.description,
            image_url: item.image_url || item.imagen_url
          };
        })
      );

      if (enrichedCart.some((i) => i.invalido)) {
        return res.status(400).json({
          error: 'Algún artículo de tu carrito ya no está disponible o ha cambiado. Quítalo del carrito y vuelve a añadirlo.',
        });
      }

      planNameToSave = enrichedCart.map(i => i.title).join(' + ');

      for (const i of enrichedCart) {
        if (i.isClass || i.isService) {
          itemsCupo.push({
            tipo: i.isClass ? 'clase' : 'servicio',
            id: i.dbId || i.id,
            name: i.title,
            quantity: Number(i.quantity) || 1,
          });
        }
      }

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

      // Los productos con descarga van SIEMPRE primero en el correo (antes
      // de servicio/clase) y el HTML de cada línea se ha aligerado (un solo
      // <a>, sin tabla ni estilos repetidos): algunos gestores de correo
      // (Gmail incluido) recortan el mensaje ("mostrar contenido reducido")
      // cuando el HTML pesa de más, y si eso pasa, así el botón de
      // descarga del producto queda protegido al principio en vez de
      // quedar oculto detrás del recorte.
      const enrichedCartParaEmail = [...enrichedCart].sort((a, b) => {
        const aEsDescarga = !a.isService && !a.isClass && a.file_url ? 0 : 1;
        const bEsDescarga = !b.isService && !b.isClass && b.file_url ? 0 : 1;
        return aEsDescarga - bEsDescarga;
      });

      const itemsList = enrichedCartParaEmail.map((item) => {
        if (item.isService || item.isClass) {
          return `<li style="margin-bottom:20px;"><strong style="font-size:16px;color:#ffffff;">${item.title} <span style="color:#aaaaaa;font-weight:normal;">(${item.isClass ? 'Clase' : 'Servicio'})</span></strong><br/><span style="color:#cccccc;font-size:13px;">Nos pondremos en contacto contigo o gestionaremos tu briefing.</span></li>`;
        } else if (item.file_url) {
          return `<li style="margin-bottom:20px;"><strong style="font-size:16px;color:#ffffff;">${item.title} <span style="color:#aaaaaa;font-weight:normal;">(Tienda)</span></strong><br/><a href="${item.file_url}" target="_blank" style="${btnStyle}">Descargar / Acceder</a></li>`;
        } else {
          return `<li style="margin-bottom:20px;"><strong style="font-size:16px;color:#ffffff;">${item.title}</strong><br/><span style="color:#cccccc;font-size:13px;">Pedido registrado correctamente.</span></li>`;
        }
      });

      linksHtml = `<ul style="list-style:none;padding:0;margin-top:15px;">${itemsList.join('')}</ul>`;
      linksText = enrichedCartParaEmail.map(i => `${i.title}: ${i.file_url || 'Servicio/Clase'}`).join(' | ');

      // Metadatos MÍNIMOS para Stripe (límite de 500 caracteres por campo
      // de metadata). Antes se guardaba también la imagen y el enlace de
      // descarga completos aquí, y con 2-3 artículos ya se superaba el
      // límite fácilmente — Stripe entonces recibía el "Pedido Múltiple"
      // genérico de más abajo y el correo/historial perdían el desglose
      // real. Ahora solo mandamos lo mínimo (id, tipo, nombre ya resuelto
      // —incluye el plan si lo tenía—, precio y cantidad); el webhook
      // (pages/api/enviar-pedido.js) vuelve a consultar la imagen y el
      // enlace de descarga FRESCOS directamente de la base de datos usando
      // el id y el tipo, así caben muchos más artículos sin desbordar el
      // límite y los datos son siempre los actuales.
      const compactCartData = enrichedCart.map(i => ({
        i: i.dbId || i.id,
        y: i.isClass ? 'clase' : (i.isService ? 'servicio' : 'producto'),
        t: String(i.title).substring(0, 60),
        p: i.price_cents,
        c: i.currency,
        q: i.quantity,
      }));

      const jsonCart = JSON.stringify(compactCartData);
      metadataPayload = {
        ...metadataPayload,
        // Salvavidas solo para un carrito verdaderamente enorme que aun
        // así no quepa en 500 caracteres: en ese caso extremo el CORREO
        // pierde el desglose exacto, pero el historial del área de
        // clientes (itemsForHistory, más abajo) nunca depende de este
        // límite y siempre queda completo.
        cart_data: jsonCart.length > 500
          ? JSON.stringify([{
              i: null,
              y: hasService ? 'servicio' : (hasClass ? 'clase' : 'producto'),
              t: 'Pedido Múltiple',
              p: totalCents,
              c: 'eur',
              q: 1,
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

      // Precio de la base de datos (del plan elegido, si lo hay). El precio
      // que manda el navegador (customPriceCents) ya no se usa.
      item = aplicarOferta(item); // oferta en vigor, si la hay
      const planDirecto = buscarPlan(item, { planName });
      if (item.active === false || planDirecto === undefined) {
        return res.status(400).json({ error: 'Este artículo o plan ya no está disponible. Recarga la página.' });
      }
      const unitAmount = precioCentimos(item, planDirecto);
      totalCents += unitAmount;
      if (hasClass || hasService) {
        itemsCupo.push({
          tipo: hasClass ? 'clase' : 'servicio',
          id: item.id,
          name: planName ? `${item.name || item.title || item.nombre || ''} (${planName})` : (item.name || item.title || item.nombre || ''),
          quantity: 1,
        });
      }

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
        // Igual que en el carrito: un array de un solo elemento con el
        // mismo formato compacto {i,y,t,p,c,q}, para que el webhook use
        // SIEMPRE el mismo camino (metadata.cart_data) sin importar si la
        // compra viene de un solo artículo o de varios, y siempre relea la
        // imagen/enlace de descarga frescos de la base de datos.
        cart_data: JSON.stringify([{
          i: String(item.id),
          y: singleItemType,
          t: String(nameResolved).substring(0, 60),
          p: unitAmount,
          c: itemCurrency,
          q: 1,
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

    // --- LÍMITE SEMANAL DE SERVICIOS Y CLASES ---
    // Solo se aplica a pedidos de pago (los gratuitos de 0 € no cuentan) y
    // nunca a la suscripción. Si la comprobación falla por cualquier motivo,
    // NO se bloquea la venta (mejor vender de más una vez que no poder
    // cobrar).
    if (!isSubscription && totalCents > 0 && itemsCupo.length > 0) {
      try {
        const estado = await estadoSemana(supabase);
        const resumen = await resumirPedido(supabase, itemsCupo);
        const comprobacion = comprobarPedido(estado, resumen);
        if (!comprobacion.ok) {
          return res.status(409).json({ error: comprobacion.message, limitReached: true });
        }
      } catch (limiteErr) {
        console.error('No se pudo comprobar el límite semanal (se deja pasar el pedido):', limiteErr);
      }
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

    // Si el pedido incluye algún servicio de SEGUIMIENTO, la página de
    // briefing enseña el formulario de seguimiento ("seg=solo") o el de
    // seguimiento más el de servicio normal ("seg=con"). Sin seguimiento no
    // se añade nada y todo queda exactamente igual que antes. Si la
    // consulta falla, se deja el formulario de servicio de siempre.
    let segQuery = '';
    if (hasService && !isSubscription) {
      try {
        const seg = await tipoFormularioServicios(supabase, itemsCupo);
        if (seg) segQuery = `&seg=${seg}`;
      } catch (segErr) {
        console.error('No se pudo comprobar si el pedido incluye un seguimiento:', segErr);
      }
    }

    let successUrl = `${siteUrl}/gracias?tipo=${tipoQuery}`;
    if (isSubscription) {
      // Suscripción: comportamiento intacto.
      successUrl = `${siteUrl}/gracias?tipo=suscripcion&session_id={CHECKOUT_SESSION_ID}`;
    } else if (isMixedCategories) {
      // Pedido con 2 o más tipos distintos (por ejemplo Producto+Servicio,
      // Servicio+Clase o Producto+Servicio+Clase): todos los briefings que
      // hagan falta (servicio y/o clase) se muestran juntos en la misma
      // página. Los productos nunca generan briefing.
      successUrl = `${siteUrl}/briefing?tipo=${tipoQuery}${segQuery}&session_id={CHECKOUT_SESSION_ID}`;
    } else if (hasService) {
      // Comportamiento exactamente igual que antes: compra de un único
      // servicio (sola o con varias unidades del mismo servicio).
      successUrl = `${siteUrl}/servicios/briefing?tipo=${tipoQuery}${segQuery}&session_id={CHECKOUT_SESSION_ID}`;
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

      // Sin cuenta pero con email: se guarda igual (user_id vacío + email)
      // para que salga en las estadísticas del admin.
      if (resolvedUserId || destinoEmail) {
        try {
          const { error: dbError } = await supabase.from('purchases').insert([
            {
              user_id: resolvedUserId || null,
              ...(resolvedUserId ? {} : { email: String(destinoEmail).trim() }),
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
            body: JSON.stringify(prepararCorreo({
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
            })),
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
            body: JSON.stringify(prepararCorreo({
              from: 'The Lab <pedidos@hottieprodthis.com>',
              reply_to: 'pedidos.thelab@gmail.com',
              to: [destinoEmail],
              subject: 'Tu solicitud en The Lab - Confirmación y Accesos',
              html: fullEmailHtml,
            })),
          });
        } catch (emailError) {
          console.error('Error enviando correos de 0€ con Resend:', emailError);
        }
      }

      return res.status(200).json({ url: successUrl, freeCheckout: true });
    }

    const session = await stripe.checkout.sessions.create({
      mode: checkoutMode,
      // Apple Pay (y Google Pay si se activa en Stripe) van dentro de 'card'.
      // Samsung Pay no se pone: en Stripe solo admite pagos en wones coreanos
      // y con euros haría fallar el pago entero.
      payment_method_types: isSubscription ? ['card'] : ['card', 'klarna', 'link', 'bizum', 'amazon_pay'],
      // Stripe no deja usar a la vez códigos promocionales y un cupón: con la
      // oferta de la suscripción va el cupón; sin ella, como siempre.
      ...(cuponSuscripcion ? { discounts: [{ coupon: cuponSuscripcion }] } : { allow_promotion_codes: true }),
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
