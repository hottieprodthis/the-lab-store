import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

// Antes se usaba el cliente público de Supabase con el userId que mandaba el
// navegador: las reglas de la base de datos no dejaban leer ni cambiar el
// perfil así, y la baja fallaba siempre. Ahora la cuenta sale de la sesión
// del propio cliente (Authorization) y el perfil se cambia desde el servidor.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const { data: datos } = token ? await supabase.auth.getUser(token) : { data: null };
    const userId = datos?.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Tienes que iniciar sesión.' });
    }

    // 1. Buscamos el perfil del usuario para ver su suscripción de Stripe
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_subscription_id, por_vida')
      .eq('id', userId)
      .single();

    if (profileError) {
      return res.status(404).json({ error: 'No se encontró tu perfil.' });
    }
    if (profile?.por_vida) {
      return res.status(400).json({ error: 'Tu suscripción es de por vida: no hay nada que cancelar.' });
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

    // 3. Quitamos el acceso
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
