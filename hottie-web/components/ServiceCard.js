import { useState } from 'react';
import Link from 'next/link';
import { formatPrice } from '../lib/format';
import { useCart } from '../context/CartContext';

export default function ServiceCard({ service }) {
  const [loading, setLoading] = useState(false);
  const { addToCart } = useCart();

  const hasPlans = Array.isArray(service.plans) && service.plans.length > 0;

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
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: service.id,
          isService: true,
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

  return (
    <div className="flex flex-col justify-between rounded-sm border border-white/10 bg-surface p-6 transition hover:border-signal/60">
      <div>
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
            /* SI TIENE PLANES: Muestra únicamente "VER OPCIONES" hacia la página del servicio */
            <Link
              href={`/servicios/${service.slug}`}
              className="rounded-sm bg-volt px-4 py-2 text-xs font-bold uppercase tracking-widest text-ink transition hover:brightness-110"
            >
              Ver opciones
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
                onClick={handleCheckout}
                disabled={loading}
                className="rounded-sm border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-paper transition hover:border-signal hover:text-signal disabled:opacity-50"
              >
                {loading ? 'CARGANDO...' : 'RESERVAR'}
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
    </div>
  );
}
