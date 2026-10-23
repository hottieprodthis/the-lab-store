import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { finSegunStripe } from '../../lib/suscripcion';

// Activa la suscripción del área de clientes al volver de pagar con tarjeta
// (pages/gracias.js). Antes lo hacía el navegador llamando directamente a la
// función activar_mi_suscripcion de Supabase, que no comprobaba ningún pago:
// cualquiera con cuenta podía activarse la suscripción gratis.
//
// Ahora se le pregunta a Stripe por la sesión de pago (session_id) y solo se
// activa si es una suscripción completada y pagada por ESTE usuario. (El
// webhook pages/api/enviar-pedido.js también la activa; esto es el refuerzo
// para que el cliente la tenga al momento.)
//
// POST { session_id } con la sesión del cliente (Authorization: Bearer <token>).
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-06-20' });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const { data: userData } = token ? await supabase.auth.getUser(token) : { data: null };
    const usuario = userData?.user;
    if (!usuario) {
      return res.status(401).json({ error: 'Tienes que iniciar sesión.' });
    }

    const { session_id: sessionId } = req.body || {};
    if (typeof sessionId !== 'string' || !sessionId.startsWith('cs_')) {
      return res.status(400).json({ error: 'Falta la sesión de pago.' });
    }

    let sesion;
    try {
      sesion = await stripe.checkout.sessions.retrieve(sessionId);
    } catch (e) {
      return res.status(404).json({ error: 'No se encuentra ese pago.' });
    }

    const pagada = sesion.status === 'complete' && (sesion.payment_status === 'paid' || sesion.payment_status === 'no_payment_required');
    const emailSesion = String(sesion.customer_details?.email || sesion.customer_email || '').toLowerCase();
    const esSuya = sesion.client_reference_id === usuario.id || (emailSesion && emailSesion === String(usuario.email || '').toLowerCase());
    if (sesion.mode !== 'subscription' || !pagada || !esSuya) {
      return res.status(403).json({ error: 'Ese pago no corresponde a una suscripción tuya completada.' });
    }

    // Hasta cuándo dura lo que Stripe ha cobrado (lib/suscripcion.js).
    let fin = null;
    if (typeof sesion.subscription === 'string') {
      try {
        fin = finSegunStripe(await stripe.subscriptions.retrieve(sesion.subscription));
      } catch (e) {
        console.error('activar-suscripcion: no se pudo leer la suscripción de Stripe:', e.message);
      }
    }
    if (!fin) {
      return res.status(500).json({ error: 'No se pudo comprobar hasta cuándo dura tu suscripción. Inténtalo de nuevo en un momento.' });
    }

    const { error } = await supabase
      .from('profiles')
      .upsert(
        {
          id: usuario.id,
          email: usuario.email,
          is_subscribed: true,
          subscribed_until: fin.toISOString(),
          ...(typeof sesion.subscription === 'string' ? { stripe_subscription_id: sesion.subscription } : {}),
        },
        { onConflict: 'id' }
      );
    if (error) {
      console.error('activar-suscripcion: error de Supabase:', error.message);
      return res.status(500).json({ error: 'No se pudo activar la suscripción.' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Error en /api/activar-suscripcion:', err);
    return res.status(500).json({ error: 'No se pudo activar la suscripción.' });
  }
}
