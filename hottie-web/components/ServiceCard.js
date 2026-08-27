import { useState } from 'react';
import { formatPrice } from '../lib/format';

export default function ServiceCard({ service }) {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    // Si no tiene precio definido, redirige al contacto
    if (!service.price_cents) {
      window.location.href = '/contacto';
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serviceId: service.id,
          name: service.name,
          description: service.description,
          priceCents: service.price_cents,
          currency: service.currency || 'eur',
        }),
      });

      const data = await res.json();

      if (data.url) {
        // Redirige a la pasarela de pago de Stripe
        window.location.href = data.url;
      } else {
        console.error('Error al crear la sesión de pago:', data.error);
        alert('Hubo un problema al iniciar el pago. Por favor, inténtalo de nuevo.');
        setLoading(false);
      }
    } catch (error) {
      console.error('Error de red/servidor:', error);
      alert('Error al conectar con el servidor.');
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col justify-between rounded-sm border border-white/10 bg-surface p-6 transition hover:border-signal/60">
      <div>
        <h3 className="font-display text-2xl tracking-wide text-paper">{service.name}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">{service.description}</p>
      </div>
      <div className="mt-6 flex items-center justify-between">
        <span className="text-volt">
          {service.price_cents ? formatPrice(service.price_cents, service.currency) : 'A consultar'}
        </span>
        <button
          onClick={handleCheckout}
          disabled={loading}
          className="rounded-sm border border-white/20 px-4 py-2 text-xs uppercase tracking-widest text-paper transition hover:border-signal hover:text-signal disabled:opacity-50"
        >
          {loading ? 'Cargando...' : 'Reservar'}
        </button>
      </div>
    </div>
  );
}
