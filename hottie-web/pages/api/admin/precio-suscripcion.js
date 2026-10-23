import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import {
  suscripcionActiva,
  desdeCambioPrecio,
  precioRenovacion,
  proximaRenovacionStripe,
  ajustarPrecioStripe,
  leerCambioPrecio,
  altaStripe,
  DIAS_AVISO_SUBIDA,
} from '../../../lib/suscripcion';
import { enviarCorreosIndividuales } from '../../../lib/correos';

// Cambia el precio de la suscripción del área de clientes desde el admin.
//
// - Quien se suscriba a partir de ahora paga el precio nuevo.
// - Quien YA está suscrito con tarjeta pasa al precio nuevo en sus próximos
//   cobros: si el precio BAJA, desde su próxima renovación; si SUBE, desde la
//   primera renovación que caiga 30 días o más después de hoy (antes sigue
//   pagando el anterior). Lo que no se puede cambiar hoy lo termina el webhook
//   (pages/api/enviar-pedido.js) cuando llega cada renovación.
// - Con PayPal no hay cobro automático: al renovar a mano se le cobra lo que
//   toque en esa fecha (lib/suscripcion.js, precioRenovacion).
// - Se avisa por correo a cada suscriptor activo, uno a uno.
//
// GET  -> cuántos suscriptores activos hay (para el aviso de confirmación).
// POST { precio } (euros) con la sesión de admin.
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-06-20' });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const formatoEuros = (cents) => `${(cents / 100).toFixed(2).replace('.', ',')} €`;
const formatoFecha = (d) =>
  d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Madrid' });

async function suscriptoresActivos() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, is_admin, is_subscribed, subscribed_until, stripe_subscription_id')
    .eq('is_subscribed', true)
    .gt('subscribed_until', new Date().toISOString());
  if (error) throw new Error(error.message);
  return (data || []).filter((p) => suscripcionActiva(p) && !p.is_admin);
}

export default async function handler(req, res) {
  try {
    // Solo la cuenta admin (profiles.is_admin), como el resto de /api/admin.
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'No autorizado: falta la sesión de admin.' });
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return res.status(401).json({ error: 'No autorizado: la sesión de admin no es válida o ha caducado.' });
    }
    const { data: perfil } = await supabase.from('profiles').select('is_admin').eq('id', userData.user.id).single();
    if (!perfil?.is_admin) return res.status(403).json({ error: 'Esta cuenta no tiene permisos de administrador.' });

    if (req.method === 'GET') {
      const activos = await suscriptoresActivos();
      return res.status(200).json({ activos: activos.length, diasAviso: DIAS_AVISO_SUBIDA });
    }
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'GET, POST');
      return res.status(405).json({ error: 'Método no permitido' });
    }

    const nuevoCents = Math.round(parseFloat(String(req.body?.precio ?? '').replace(',', '.')) * 100);
    if (!Number.isFinite(nuevoCents) || nuevoCents < 50) {
      return res.status(400).json({ error: 'El precio tiene que ser de al menos 0,50 €.' });
    }

    const { data: ajuste } = await supabase.from('settings').select('value').eq('key', 'subscription_price').maybeSingle();
    const { data: ajusteCambio } = await supabase.from('settings').select('value').eq('key', 'subscription_price_change').maybeSingle();
    // Si había un cambio anterior que aún no ha llegado a aplicarse, los
    // suscriptores siguen pagando el precio de antes de ese cambio: se parte
    // de ese precio para no acortar el aviso.
    const pendiente = leerCambioPrecio(ajusteCambio?.value);
    const pendienteSinAplicar = pendiente && new Date(pendiente.desde) > new Date();
    const anteriorCents = pendienteSinAplicar
      ? Number(pendiente.anterior_cents)
      : Math.round(Number(ajuste?.value) * 100) || 799;
    const valorPrecio = (nuevoCents / 100).toFixed(2);

    const { error: errPrecio } = await supabase
      .from('settings')
      .upsert({ key: 'subscription_price', value: valorPrecio }, { onConflict: 'key' });
    if (errPrecio) return res.status(500).json({ error: errPrecio.message });

    if (nuevoCents === anteriorCents && !pendienteSinAplicar) {
      return res.status(200).json({ ok: true, sinCambios: true });
    }

    const ahora = new Date();
    const desde = desdeCambioPrecio(anteriorCents, nuevoCents, ahora);
    // hecho_en: quien se suscriba a partir de ahora ya paga el precio nuevo.
    const cambio = { nuevo_cents: nuevoCents, anterior_cents: anteriorCents, desde: desde.toISOString(), hecho_en: ahora.toISOString() };
    const { error: errCambio } = await supabase
      .from('settings')
      .upsert({ key: 'subscription_price_change', value: JSON.stringify(cambio) }, { onConflict: 'key' });
    if (errCambio) return res.status(500).json({ error: errCambio.message });

    const sube = nuevoCents > anteriorCents;
    const activos = await suscriptoresActivos();
    const correos = [];
    const fallosStripe = [];

    for (const p of activos) {
      if (!p.email) continue;
      let fechaAplicacion = desde;

      if (p.stripe_subscription_id) {
        try {
          const sub = await stripe.subscriptions.retrieve(p.stripe_subscription_id);
          const proxima = proximaRenovacionStripe(sub);
          if (proxima) {
            await ajustarPrecioStripe(stripe, sub, precioRenovacion(nuevoCents, cambio, proxima, altaStripe(sub)));
            // Primera renovación en la que pagará el precio nuevo.
            fechaAplicacion = new Date(proxima);
            while (fechaAplicacion < desde) fechaAplicacion.setMonth(fechaAplicacion.getMonth() + 1);
          }
        } catch (e) {
          fallosStripe.push(p.email);
          console.error('precio-suscripcion: no se pudo ajustar en Stripe', p.stripe_subscription_id, e.message);
        }
      }

      const conTarjeta = Boolean(p.stripe_subscription_id);
      correos.push({
        from: 'The Lab <pedidos@hottieprodthis.com>',
        reply_to: 'pedidos.thelab@gmail.com',
        to: [p.email],
        subject: `Cambio de precio de tu suscripción a The Lab: ${formatoEuros(nuevoCents)}/mes`,
        html: `
          <div style="background-color:#0d0d0d; color:#ffffff; font-family: Arial, sans-serif; padding:30px;">
            <p style="color:#CCFF00; font-weight:bold; letter-spacing:2px; font-size:12px;">THE LAB — ÁREA DE CLIENTES</p>
            <h2 style="color:#ffffff;">Actualizamos el precio de la suscripción</h2>
            <p style="color:#dddddd;">El precio de la suscripción mensual pasa de <strong>${formatoEuros(anteriorCents)}</strong> a <strong style="color:#CCFF00;">${formatoEuros(nuevoCents)}</strong> al mes.</p>
            <p style="color:#dddddd;">${
              conTarjeta
                ? `Se aplicará a partir de tu renovación del <strong>${formatoFecha(fechaAplicacion)}</strong>. Hasta entonces sigues pagando lo mismo.`
                : `Se aplicará a las renovaciones que hagas a partir del <strong>${formatoFecha(desde)}</strong>.`
            }</p>
            ${
              conTarjeta
                ? `<p style="color:#dddddd;">${sube ? 'Si no quieres continuar con el nuevo precio, puedes cancelar tu suscripción cuando quieras desde tu área de clientes antes de esa fecha, sin ningún coste.' : 'No tienes que hacer nada: el cambio se aplica solo.'}</p>`
                : ''
            }
            <div style="margin-top:24px;">
              <a href="https://hottieprodthis.com/area-cliente" style="background-color:#CCFF00; color:#000000; padding:14px 28px; text-decoration:none; font-weight:900; border-radius:4px; display:inline-block; text-transform:uppercase;">Ir a mi área de clientes</a>
            </div>
          </div>
        `,
      });
    }

    let avisados = 0;
    let errorCorreo = null;
    if (correos.length > 0) {
      try {
        avisados = await enviarCorreosIndividuales(correos);
      } catch (e) {
        errorCorreo = e.message;
        console.error('precio-suscripcion: error enviando avisos:', e.message);
      }
    }

    return res.status(200).json({
      ok: true,
      sube,
      desde: desde.toISOString(),
      activos: activos.length,
      avisados,
      errorCorreo,
      fallosStripe,
    });
  } catch (err) {
    console.error('Error en /api/admin/precio-suscripcion:', err);
    return res.status(500).json({ error: 'No se pudo cambiar el precio.' });
  }
}
