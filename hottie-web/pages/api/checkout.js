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

  const { productId, isService, isSubscription, planName, customPriceCents, items, returnUrl, userId } = req.body;

  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `https://${req.headers.host}`;
    
    const refererHeader = req.headers.referer;
    let cancelUrl = returnUrl || refererHeader || siteUrl;

    let lineItems = [];
    let hasService = false;
    let isClassItem = false;
    let driveLink = '';
    let metadataPayload = {};
    let checkoutMode = 'payment';

    // OPCIÓN 1: SUSCRIPCIÓN MENSUAL (Área de Clientes) - Lee el precio dinámico de Supabase
    if (isSubscription) {
      checkoutMode = 'subscription';
      
      let finalPriceCents = customPriceCents;
      if (!finalPriceCents) {
        const { data: settingData } = await supabase
          .from('settings')
          .select('value')
          .eq('key', 'subscription_price')
          .single();
        
        if (settingData && settingData.value) {
          finalPriceCents = Math.round(Number(settingData.value) * 100);
        } else {
          finalPriceCents = 799; // Valor por defecto si no encuentra nada
        }
      }
      
      lineItems = [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: planName || 'Suscripción The Lab — Área de Clientes',
              description: 'Acceso mensual a todos los packs y posts exclusivos',
            },
            unit_amount: finalPriceCents,
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ];

      metadataPayload = {
        type: 'subscription',
      };
    } 
    // OPCIÓN 2: Compra acumulada desde el Carrito
    else if (items && Array.isArray(items) && items.length > 0) {
      const enrichedCart = await Promise.all(
        items.map(async (item) => {
          let downloadUrl = item.file_url || item.drive_url || item.driveUrl || item.link || '';
          let nameResolved = item.name || item.title || item.nombre || '';
          
          const cleanId = item.id && String(item.id).includes('-') ? String(item.id).split('-')[0] : item.id;

          if (cleanId) {
            let dbItem = null;

            const { data: serviceData } = await supabase.from('services').select('*').eq('id', cleanId).single();
            if (serviceData) {
              dbItem = serviceData;
            } else {
              const { data: classData } = await supabase.from('classes').select('*').eq('id', cleanId).single();
              if (classData) {
                dbItem = classData;
                isClassItem = true;
              } else {
                const { data: productData } = await supabase.from('products').select('*').eq('id', cleanId).single();
                if (productData) dbItem = productData;
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

      metadataPayload = {
        cart_data: JSON.stringify(
          enrichedCart.map(i => ({
            id: i.id,
            title: i.title,
            isService: i.isService,
            file_url: i.file_url
          }))
        ),
      };
    } 
    // OPCIÓN 3: Compra directa instantánea de un producto/clase/servicio
    else if (productId) {
      let item = null;

      if (isService) {
        const { data: serviceData } = await supabase
          .from('services')
          .select('*')
          .eq('id', productId)
          .single();
        if (serviceData) item = serviceData;
      }

      if (!item) {
        const { data: classData } = await supabase
          .from('classes')
          .select('*')
          .eq('id', productId)
          .single();
        if (classData) {
          item = classData;
          hasService = true;
          isClassItem = true;
        }
      }

      if (!item) {
        const { data: productData } = await supabase
          .from('products')
          .select('*')
          .eq('id', productId)
          .single();
        if (productData) item = productData;
      }

      if (!item) {
        return res.status(404).json({ error: 'Artículo no encontrado.' });
      }

      const unitAmount = customPriceCents || item.price_cents || item.precio_centimos || (item.price ? Math.round(item.price * 100) : 0);
      
      if (isService) hasService = true;
      driveLink = item.file_url || item.drive_url || item.driveUrl || item.download_url || item.link || '';
      
      let nameResolved = item.name || item.title || item.nombre || 'Producto Digital';
      if (planName) {
        nameResolved = `${nameResolved} (${planName})`;
      }

      lineItems = [
        {
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
        },
      ];

      metadataPayload = {
        product_id: String(item.id),
        product_name: nameResolved,
        is_service: hasService ? 'true' : 'false',
        driveUrl: driveLink,
        file_url: driveLink,
      };
    } else {
      return res.status(400).json({ error: 'No se enviaron artículos para la compra.' });
    }

    // Lógica de Success URL
    let successUrl = `${siteUrl}/gracias?tipo=producto`;
    if (isSubscription) {
      successUrl = `${siteUrl}/gracias?tipo=suscripcion&session_id={CHECKOUT_SESSION_ID}`;
    } else if (hasService) {
      if (isClassItem) {
        successUrl = `${siteUrl}/clases/briefing?session_id={CHECKOUT_SESSION_ID}`;
      } else {
        successUrl = `${siteUrl}/servicios/briefing?session_id={CHECKOUT_SESSION_ID}`;
      }
    }

    const session = await stripe.checkout.sessions.create({
      mode: checkoutMode,
      payment_method_types: isSubscription ? ['card'] : ['card', 'klarna', 'link', 'bizum'],
      allow_promotion_codes: true,
      line_items: lineItems,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: metadataPayload,
      client_reference_id: userId || undefined, // <-- ÚNICA LÍNEA AÑADIDA AQUÍ
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Error Stripe Checkout:', err);
    return res.status(500).json({ error: 'No se ha podido crear el pago con Stripe' });
  }
}
