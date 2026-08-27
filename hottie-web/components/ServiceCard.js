import { useState } from 'react';
import { formatPrice } from '../lib/format';
import { useCart } from '../context/CartContext';

export default function ServiceCard({ service }) {
  const [loading, setLoading] = useState(false);
  const { addToCart } = useCart();

  const handleCheckout = async () => {
    // Si no tiene precio definido, redirige al contacto
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
          isService: true, // Importante: así la API sabe que debe redirigir a /servicios/briefing tras el pago
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
      <div className="mt-6 flex items-center justify-between gap-2">
        <span className="text-volt">
          {service.price_cents || service.price ? formatPrice(service.price_cents || Math.round(service.price * 100), service.currency) : 'A consultar'}
        </span>
        
        <div className="flex items-center gap-2">
          {/* Botón para Añadir al Carrito acumulativo */}
          {(service.price_cents || service.price) && (
            <button
              onClick={() => addToCart(service, true)}
              className="rounded-sm border border-[#CCFF00] px-3 py-2 text-xs uppercase tracking-widest text-[#CCFF00] transition hover:bg-[#CCFF00] hover:text-black"
            >
              + Carrito
            </button>
          )}

          {/* Botón de Pago Directo */}
          <button
            onClick={handleCheckout}
            disabled={loading}
            className="rounded-sm border border-white/20 px-4 py-2 text-xs uppercase tracking-widest text-paper transition hover:border-signal hover:text-signal disabled:opacity-50"
          >
            {loading ? 'CARGANDO...' : 'RESERVAR'}
          </button>
        </div>
      </div>
    </div>
  );
}
