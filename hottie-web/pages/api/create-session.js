import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { serviceId, name, description, priceCents, currency } = req.body;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: currency || 'eur',
            product_data: {
              name: name,
              description: description || undefined,
            },
            unit_amount: priceCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      metadata: {
        serviceId: serviceId,
      },
      success_url: `${req.headers.origin}/exito?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/servicios`,
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Error Stripe:', err);
    res.status(500).json({ error: err.message });
  }
}
