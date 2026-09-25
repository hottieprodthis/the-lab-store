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
    let isClassItem = false;
    let driveLink = '';
    let metadataPayload = {
      user_id: resolvedUserId || '',
    };
    let checkoutMode = 'payment';
    let totalCents = 0; // Para comprobar si el carrito es de 0€

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

          if (cleanId) {
            let dbItem = null;
            const { data: sData } = await supabase.from('services').select('*').eq('id', cleanId).single();
            if (sData) {
              dbItem = sData;
            } else {
              const { data: cData } = await supabase.from('classes').select('*').eq('id', cleanId).single();
              if (cData) {
                dbItem = cData;
                isClassItem = true;
              } else {
                const { data: pData } = await supabase.from('products').select('*').eq('id', cleanId).single();
                if (pData) dbItem = pData;
              }
            }

            if (dbItem) {
              if (!downloadUrl && !item.isService) {
                downloadUrl = dbItem.file_url || dbItem.drive_url || dbItem.driveUrl || dbItem.download_url || dbItem.link || '';
              }
              if (!nameResolved) {
                nameResolved = dbItem.name || dbItem.title || dbItem.nombre || '';
              }
            }
          }

          if (!nameResolved) nameResolved = item.isService ? 'Servicio Digital' : 'Producto Digital';
          if (item.isService) hasService = true;

          const finalPriceCents = item.price_cents || item.precio_centimos || (item.price ? Math.round(item.price * 100) : 0);
          totalCents += finalPriceCents * (item.quantity || 1);

          return {
            id: item.id,
            title: nameResolved,
            isService: !!item.isService,
            file_url: downloadUrl,
            quantity: item.quantity || 1,
            price_cents: finalPriceCents,
            currency: item.moneda || item.currency || 'eur',
            description: item.description,
            image_url: item.image_url || item.imagen_url
          };
        })
      );

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

      // APLICAMOS LA CORRECCIÓN DE STRIPE METADATA LÍMITE 500 CHARS
      const compactCartData = enrichedCart.map(i => ({ 
        id: i.id, 
        title: String(i.title).substring(0, 25), // Acortamos nombres largos
        isService: i.isService, 
        file_url: i.file_url 
      }));
      
      const jsonCart = JSON.stringify(compactCartData);
      
      metadataPayload = {
        ...metadataPayload,
        // Nos aseguramos firmemente de que no exceda 500 caracteres, cortando si fuera necesario
        cart_data: jsonCart.length > 490 ? jsonCart.substring(0, 490) : jsonCart,
      };
    } 
    // 3. COMPRA DIRECTA DE UN PRODUCTO AISLADO
    else if (productId) {
      let item = null;

      if (isService) {
        const { data: sData } = await supabase.from('services').select('*').eq('id', productId).single();
        if (sData) item = sData;
      }
      if (!item) {
        const { data: cData } = await supabase.from('classes').select('*').eq('id', productId).single();
        if (cData) {
          item = cData;
          hasService = true;
          isClassItem = true;
        }
      }
      if (!item) {
        const { data: pData } = await supabase.from('products').select('*').eq('id', productId).single();
        if (pData) item = pData;
      }

      if (!item) {
        return res.status(404).json({ error: 'Artículo no encontrado.' });
      }

      const unitAmount = customPriceCents || item.price_cents || item.precio_centimos || (item.price ? Math.round(item.price * 100) : 0);
      totalCents += unitAmount;

      if (isService) hasService = true;
      driveLink = item.file_url || item.drive_url || item.driveUrl || item.download_url || item.link || '';
      
      let nameResolved = item.name || item.title || item.nombre || 'Producto Digital';
      if (planName) nameResolved = `${nameResolved} (${planName})`;

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
        is_service: hasService ? 'true' : 'false',
        driveUrl: String(driveLink).substring(0, 200), // Protegemos enlaces sueltos inmensamente largos
        file_url: String(driveLink).substring(0, 200),
      };
    } else {
      return res.status(400).json({ error: 'No se enviaron artículos para la compra.' });
    }

    // APLICAMOS LA CORRECCIÓN DE STRIPE DE 0 EUROS (MIN 50 céntimos / 0.50€)
    if (totalCents > 0 && totalCents < 50) {
      return res.status(400).json({ error: 'Stripe requiere un importe mínimo de 0.50€' });
    }

    let successUrl = `${siteUrl}/gracias?tipo=producto`;
    if (isSubscription) {
      successUrl = `${siteUrl}/gracias?tipo=suscripcion&session_id={CHECKOUT_SESSION_ID}`;
    } else if (hasService) {
      successUrl = isClassItem ? `${siteUrl}/clases/briefing?session_id={CHECKOUT_SESSION_ID}` : `${siteUrl}/servicios/briefing?session_id={CHECKOUT_SESSION_ID}`;
    }

    // Si el carrito entero cuesta 0.00€, redirigimos a gracias automáticamente sin pasar por Stripe
    if (totalCents === 0 && checkoutMode !== 'subscription') {
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
