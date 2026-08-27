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
      error: 'Falta configurar STRIPE_SECRET_KEY en las variables de entorno del servidor.',
    });
  }

  const { productId, isService } = req.body;

  if (!productId) {
    return res.status(400).json({ error: 'Falta el ID del producto o servicio.' });
  }

  try {
    const table = isService ? 'services' : 'products';

    // Obtenemos el producto directamente por su ID
    const { data: item, error } = await supabase
      .from(table)
      .select('*')
      .eq('id', productId)
      .single();

    if (error || !item) {
      console.error('Error buscando el producto:', error);
      return res.status(404).json({ error: 'Artículo no encontrado.' });
    }

    // Calcula el precio en céntimos
    const unitAmount = item.price_cents || item.precio_centimos || (item.price ? Math.round(item.price * 100) : 60);

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `https://${req.headers.host}`;

    const successUrl = isService
      ? `${siteUrl}/servicios/exito`
      : `${siteUrl}/gracias?tipo=producto`;

    // Extrae la URL probando file_url (donde está tu enlace en Supabase)
    const driveLink = item.file_url || item.drive_url || item.driveUrl || item.download_url || item.link || '';

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      allow_promotion_codes: true, // <-- Casilla para introducir cupones en Stripe
      line_items: [
        {
          price_data: {
            currency: (item.moneda || item.currency || 'eur').toLowerCase(),
            product_data: {
              name: item.title || item.name || item.nombre || 'Producto Digital',
              description: item.description ? item.description.slice(0, 300) : undefined,
              images: item.image_url || item.imagen_url ? [item.image_url || item.imagen_url] : undefined,
            },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: item.slug ? `${siteUrl}/tienda/${item.slug}?compra=cancelada` : `${siteUrl}/`,
      metadata: {
        product_id: String(item.id),
        is_service: isService ? 'true' : 'false',
        driveUrl: driveLink,
        file_url: driveLink,
      },
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Error Stripe Checkout:', err);
    return res.status(500).json({ error: 'No se ha podido crear el pago con Stripe' });
  }
}
