import { useState } from 'react';
import Link from 'next/link';
import { formatPrice } from '../lib/format';
import { useCart } from '../context/CartContext';
import { supabase } from '../lib/supabaseClient';
import PayPalButton from './PayPalButton';

export default function ServiceCard({ service }) {
  const [loading, setLoading] = useState(false);
  // Menú de "cómo pagar" para los servicios/clases de precio único (sin
  // planes): estos nunca pasan por la página [slug].js (aquí mismo se
  // compran), así que el menú de tarjeta/PayPal vive en esta tarjeta.
  const [openPayment, setOpenPayment] = useState(false);
  const [paypalDone, setPaypalDone] = useState(false);
  const { addToCart } = useCart();

  const hasPlans = Array.isArray(service.plans) && service.plans.length > 0;
  // Determina la ruta según si es una clase o un servicio
  const basePath = service.isClass ? '/clases' : '/servicios';

  // Si tiene planes, calcular el precio más bajo de entre ellos
  let minPlanPriceCents = null;
  if (hasPlans) {
    const prices = service.plans
      .map((p) => parseFloat(p.price))
      .filter((p) => !isNaN(p) && p > 0);
    if (prices.length > 0) {
      minPlanPriceCents = Math.round(Math.min(...prices) * 100);
    }
  }

  const handleCheckout = async () => {
    if (!service.price_cents && !service.price) {
      window.location.href = '/contacto';
      return;
    }

    setLoading(true);

    try {
      // Adjuntamos el usuario logueado (si lo hay) para que esta reserva
      // también quede asociada a su historial en el área de clientes.
      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: service.id,
          isService: true,
          returnUrl: window.location.href,
          userId: session?.user?.id || null,
          userEmail: session?.user?.email || null,
        }),
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('Error al iniciar la reserva. Inténtalo de nuevo.');
        setLoading(false);
      }
    } catch (error) {
      console.error('Error de conexión:', error);
      alert('Error de conexión con el servidor.');
      setLoading(false);
    }
  };

  // Registra en el historial (y envía los correos) una reserva de precio
  // único pagada con PayPal. No hace falta planName/amountCents porque
  // aquí no hay plan: el precio ya es el precio base del servicio/clase.
  const handlePaypalSuccess = async (details) => {
    setPaypalDone(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const payerEmail = details?.payer?.email_address || null;
      const payerName = [details?.payer?.name?.given_name, details?.payer?.name?.surname]
        .filter(Boolean)
        .join(' ');

      await fetch('/api/registrar-pago-paypal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: service.isClass ? 'clase' : 'servicio',
          itemId: service.id,
          userId: session?.user?.id || null,
          userEmail: session?.user?.email || payerEmail,
          payerEmail,
          payerName,
          paypalOrderId: details?.id || null,
        }),
      });
    } catch (err) {
      console.error('No se pudo registrar el pago de PayPal de este artículo en el historial:', err);
    }
  };

  return (
    <div className="flex flex-col justify-between rounded-sm border border-white/10 bg-surface p-6 transition hover:border-signal/60">
      <div>
        {service.image_url && (
          <div className="mb-4 overflow-hidden rounded-sm border border-white/10">
            <img
              src={service.image_url}
              alt={service.name}
              className="h-40 w-full object-cover"
            />
          </div>
        )}
        <h3 className="font-display text-2xl tracking-wide text-paper">{service.name}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">{service.description}</p>
      </div>

      <div className="mt-6 flex items-center justify-between gap-2 border-t border-white/10 pt-4">
        {/* VISUALIZACIÓN DE PRECIO */}
        <span className="text-volt font-bold">
          {hasPlans ? (
            minPlanPriceCents ? (
              `Desde ${formatPrice(minPlanPriceCents, service.currency)}`
            ) : (
              'Ver planes'
            )
          ) : service.price_cents || service.price ? (
            formatPrice(service.price_cents || Math.round(service.price * 100), service.currency)
          ) : (
            'A consultar'
          )}
        </span>

        {/* ACCIONES Y BOTONES */}
        <div className="flex items-center gap-2">
          {hasPlans ? (
            /* SI TIENE PLANES: Muestra únicamente "VER OPCIONES" hacia la página de la clase/servicio */
            <Link
              href={`${basePath}/${service.slug}`}
              style={{ 
                color: '#000000', 
                WebkitTextFillColor: '#000000',
                forcedColorAdjust: 'none',
                colorScheme: 'only light'
              }}
              className="rounded-sm bg-volt px-4 py-2 text-xs font-bold uppercase tracking-widest transition hover:brightness-110"
            >
              <span style={{ color: '#000000', WebkitTextFillColor: '#000000' }}>
                Ver opciones
              </span>
            </Link>
          ) : service.price_cents || service.price ? (
            /* SI ES PRECIO ÚNICO: Permite añadir al carrito y Checkout directo */
            <>
              <button
                onClick={() => addToCart(service, true)}
                className="rounded-sm border border-[#CCFF00] px-3 py-2 text-xs font-semibold uppercase tracking-widest text-[#CCFF00] transition hover:bg-[#CCFF00] hover:text-black"
              >
                + Carrito
              </button>

              <button
                onClick={() => setOpenPayment(!openPayment)}
                className="rounded-sm border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-paper transition hover:border-signal hover:text-signal"
              >
                RESERVAR
              </button>
            </>
          ) : (
            /* SI ES A CONSULTAR: Enlace directo a contacto */
            <Link
              href={`/contacto?servicio=${service.slug}`}
              className="rounded-sm border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-paper transition hover:border-signal hover:text-signal"
            >
              Consultar
            </Link>
          )}
        </div>
      </div>

      {/* Menú con las dos formas de pago, igual que en la ficha con
          planes: antes RESERVAR lanzaba Stripe directamente sin dar
          opción a PayPal. */}
      {openPayment && (
        <div className="mt-4 border-t border-white/10 pt-4 space-y-3">
          {paypalDone ? (
            <p className="text-sm text-volt text-right">¡Pago con PayPal completado! Revisa tu correo.</p>
          ) : (
            <>
              <button
                onClick={handleCheckout}
                disabled={loading}
                className="block w-full text-center rounded-sm bg-[#CCFF00] px-4 py-3 text-xs font-bold uppercase tracking-widest text-black transition hover:brightness-110 disabled:opacity-50"
              >
                {loading ? 'CARGANDO...' : 'Pagar con tarjeta y más'}
              </button>
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-white/10"></div>
                <span className="flex-shrink mx-3 text-muted text-xs uppercase font-semibold">O pagar con</span>
                <div className="flex-grow border-t border-white/10"></div>
              </div>
              <div className="w-full relative z-10 min-h-[50px]">
                <PayPalButton
                  amount={(service.price_cents || Math.round((service.price || 0) * 100)) / 100}
                  currency={(service.currency || 'eur').toUpperCase()}
                  label={service.name}
                  onSuccess={handlePaypalSuccess}
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
