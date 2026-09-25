import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
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

  const { productId, isService, isSubscription, planName, customPriceCents, items, returnUrl, userId: bodyUserId } = req.body;

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

      // JSON SEGURO PARA STRIPE (Evita sobrepasar los 500 caracteres)
      const compactCartData = enrichedCart.map(i => ({
        title: String(i.title).substring(0, 30),
        isService: i.isService || i.isClass, 
        file_url: i.file_url ? String(i.file_url).split('?')[0].substring(0, 100) : '' 
      }));
      
      const jsonCart = JSON.stringify(compactCartData);
      
      metadataPayload = {
        ...metadataPayload,
        cart_data: jsonCart.length > 500 ? JSON.stringify([{title: 'Pedido Múltiple', isService: hasService, file_url: ''}]) : jsonCart,
      };
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

      lineItems = [{
        price_data: {
          currency: (item.moneda || item.currency || 'eur').toLowerCase(),
          product_data: {
            name: nameResolved,
            description: item.description ? item.description.slice(0, 300) : undefined,
            images: item.image_url || item.imagen_url ? [item.image_url || item.imagen_url] : undefined,
          },
          unit_amount: unitAmount,
        },
        quantity: 1,
      }];

      metadataPayload = {
        ...metadataPayload,
        product_id: String(item.id),
        product_name: String(nameResolved).substring(0, 50),
        is_service: (hasService || hasClass) ? 'true' : 'false',
        file_url: String(driveLink).split('?')[0].substring(0, 150),
      };
    } else {
      return res.status(400).json({ error: 'No se enviaron artículos para la compra.' });
    }

    if (totalCents > 0 && totalCents < 50) {
      return res.status(400).json({ error: 'Stripe requiere un importe mínimo de 0.50€' });
    }

    // --- DETERMINAR EL TIPO EXACTO PARA LA PÁGINA DE GRACIAS ---
    let tipoQuery = 'producto';
    const totalCategories = (hasService ? 1 : 0) + (hasClass ? 1 : 0) + (hasProduct ? 1 : 0);

    if (isSubscription) {
      tipoQuery = 'suscripcion';
    } else if (totalCategories > 1) {
      tipoQuery = 'mixto'; // Si hay mezcla de clases, servicios o productos
    } else if (hasService) {
      tipoQuery = 'servicio';
    } else if (hasClass) {
      tipoQuery = 'clase';
    }

    let successUrl = `${siteUrl}/gracias?tipo=${tipoQuery}`;
    if (isSubscription) {
      successUrl = `${siteUrl}/gracias?tipo=suscripcion&session_id={CHECKOUT_SESSION_ID}`;
    } else if (hasService && totalCategories === 1) {
      successUrl = `${siteUrl}/servicios/briefing?session_id={CHECKOUT_SESSION_ID}`;
    } else if (hasClass && totalCategories === 1) {
      successUrl = `${siteUrl}/clases/briefing?session_id={CHECKOUT_SESSION_ID}`;
    }

    // --- SI EL CARRITO ES DE 0.00€ (GUARDAMOS DIRECTAMENTE EN SUPABASE) ---
    if (totalCents === 0 && checkoutMode !== 'subscription') {
      if (resolvedUserId) {
        try {
          await supabase.from('purchases').insert([
            {
              user_id: resolvedUserId,
              amount: 0,
              plan_name: planNameToSave
            }
          ]);
        } catch (e) {
          console.error('Error guardando compra de 0€ en Supabase:', e);
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
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Error Stripe Checkout:', err);
    return res.status(500).json({ error: 'No se ha podido crear el pago con Stripe' });
  }
}
