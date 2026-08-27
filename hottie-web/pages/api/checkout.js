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

  const { productId, isService, items } = req.body;

  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `https://${req.headers.host}`;
    let lineItems = [];
    let hasService = false;
    let driveLink = '';
    let metadataPayload = {};

    // OPCIÓN A: Compra acumulada desde el Carrito
    if (items && Array.isArray(items) && items.length > 0) {
      const enrichedCart = await Promise.all(
        items.map(async (item) => {
          const table = item.isService ? 'services' : 'products';
          let downloadUrl = item.file_url || item.drive_url || item.driveUrl || item.link || '';
          let nameResolved = item.name || item.title || item.nombre || '';

          if (item.id) {
            const { data: dbItem } = await supabase
              .from(table)
              .select('*')
              .eq('id', item.id)
              .single();

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

          return {
            id: item.id,
            title: nameResolved,
            isService: !!item.isService,
            file_url: downloadUrl,
            quantity: item.quantity || 1,
            price_cents: item.price_cents || item.precio_centimos || (item.price ? Math.round(item.price * 100) : 60),
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
    // OPCIÓN B: Compra directa instantánea
    else if (productId) {
      const table = isService ? 'services' : 'products';
      const { data: item, error } = await supabase
        .from(table)
        .select('*')
        .eq('id', productId)
        .single();

      if (error || !item) {
        return res.status(404).json({ error: 'Artículo no encontrado.' });
      }

      const unitAmount = item.price_cents || item.precio_centimos || (item.price ? Math.round(item.price * 100) : 60);
      hasService = isService;
      driveLink = item.file_url || item.drive_url || item.driveUrl || item.download_url || item.link || '';
      const nameResolved = item.name || item.title || item.nombre || 'Producto Digital';

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
        is_service: isService ? 'true' : 'false',
        driveUrl: driveLink,
        file_url: driveLink,
      };
    } else {
      return res.status(400).json({ error: 'No se enviaron productos para la compra.' });
    }

    const successUrl = hasService
      ? `${siteUrl}/servicios/briefing?session_id={CHECKOUT_SESSION_ID}`
      : `${siteUrl}/gracias?tipo=producto`;

    const cancelUrl = hasService ? `${siteUrl}/servicios` : `${siteUrl}/tienda`;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card', 'klarna', 'link', 'bizum'],
      allow_promotion_codes: true,
      line_items: lineItems,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: metadataPayload,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Error Stripe Checkout:', err);
    return res.status(500).json({ error: 'No se ha podido crear el pago con Stripe' });
  }
}
