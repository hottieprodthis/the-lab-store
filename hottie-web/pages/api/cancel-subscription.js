import { supabase } from '../../lib/supabaseClient';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'Falta el ID de usuario' });
    }

    // 1. Buscamos el perfil del usuario en Supabase para ver su código de suscripción de Stripe
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_subscription_id')
      .eq('id', userId)
      .single();

    if (profileError) {
      return res.status(404).json({ error: 'No se encontró tu perfil.' });
    }

    // 2. Si la suscripción se pagó con tarjeta (Stripe), la cancelamos de
    // verdad ahí para que no se le vuelva a cobrar el mes que viene. Si se
    // pagó con PayPal (cobro único mensual, sin suscripción real en
    // Stripe) no hay nada que cancelar en Stripe: ese cobro ya no se
    // repite solo, así que aquí simplemente le quitamos el acceso abajo.
    if (profile?.stripe_subscription_id) {
      try {
        await stripe.subscriptions.cancel(profile.stripe_subscription_id);
      } catch (stripeErr) {
        // Si Stripe ya no la tiene (por ejemplo, ya estaba cancelada o
        // caducada), seguimos igualmente para dejar al usuario sin acceso.
        console.error('Aviso al cancelar en Stripe (se continúa igualmente):', stripeErr.message);
      }
    }

    // 3. Actualizamos Supabase para quitarle los privilegios de suscrito
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ is_subscribed: false, stripe_subscription_id: null })
      .eq('id', userId);

    if (updateError) {
      throw updateError;
    }

    return res.status(200).json({ success: true, message: 'Suscripción cancelada correctamente.' });
  } catch (err) {
    console.error('Error al cancelar la suscripción:', err);
    return res.status(500).json({ error: 'Hubo un error al procesar la baja en el servidor.' });
  }
}
