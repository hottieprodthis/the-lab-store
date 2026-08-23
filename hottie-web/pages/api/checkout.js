import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
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

  const { productId } = req.body;
  if (!productId) {
    return res.status(400).json({ error: 'Falta el producto' });
  }

  // Volvemos a leer el precio real desde la base de datos (nunca nos fiamos
  // del precio que pueda venir del navegador).
  const { data: product, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .eq('active', true)
    .single();

  if (error || !product) {
    return res.status(404).json({ error: 'Producto no encontrado' });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `https://${req.headers.host}`;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: product.currency || 'eur',
            product_data: {
              name: product.name,
              description: product.description?.slice(0, 300) || undefined,
              images: product.image_url ? [product.image_url] : undefined,
            },
            unit_amount: product.price_cents,
          },
          quantity: 1,
        },
      ],
      success_url: `${siteUrl}/tienda/${product.slug}?compra=exito`,
      cancel_url: `${siteUrl}/tienda/${product.slug}?compra=cancelada`,
      metadata: { product_id: product.id, product_slug: product.slug },
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'No se ha podido crear el pago con Stripe' });
  }
}
