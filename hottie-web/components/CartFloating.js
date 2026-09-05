import { useState } from 'react';
import { useCart } from '../context/CartContext';

export default function CartFloating() {
  const { 
    cart, 
    isOpen, 
    setIsOpen, 
    removeFromCart, 
    updateQuantity, 
    clearCart, 
    totalItems, 
    totalPrice 
  } = useCart();
  
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setLoading(true);

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: cart,
        }),
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Ocurrió un error al iniciar el pago.');
        setLoading(false);
      }
    } catch (err) {
      console.error('Error en checkout:', err);
      alert('Error de conexión al procesar el pago.');
      setLoading(false);
    }
  };

  return (
    <>
      {/* 1. BOTÓN FLOTANTE REDONDO #CCFF00 CON CARRITO NEGRO */}
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Ver carrito"
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#CCFF00] text-black shadow-xl shadow-[#CCFF00]/30 transition-all duration-200 hover:scale-110 active:scale-95"
      >
        <svg
          className="h-7 w-7 text-black"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z"
          />
        </svg>

        {/* Contador de artículos */}
        {totalItems > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow">
            {totalItems}
          </span>
        )}
      </button>

      {/* 2. FONDO OSCURO AL ABRIR */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity"
        />
      )}

      {/* 3. PANEL DESLIZABLE LATERAL (DRAWER) */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-md border-l border-white/10 bg-ink p-6 shadow-2xl transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col justify-between">
          {/* Cabecera del panel */}
          <div>
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h2 className="font-display text-2xl tracking-wide text-paper uppercase">
                Tus Artículos ({totalItems})
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-muted hover:text-paper font-bold text-xl"
              >
                ✕
              </button>
            </div>

            {/* Lista de productos solicitados */}
            <div className="mt-6 max-h-[60vh] space-y-4 overflow-y-auto pr-2">
              {cart.length === 0 ? (
                <div className="py-12 text-center text-muted font-body">
                  <p>Tu selección está vacía.</p>
                  <p className="text-xs mt-2">Navega por la tienda o servicios para añadir artículos.</p>
                </div>
              ) : (
                cart.map((item, index) => {
                  const price = item.price || (item.price_cents ? item.price_cents / 100 : 0);
                  const title = item.title || item.name || item.nombre || 'Producto / Servicio';
                  return (
                    <div
                      key={`${item.id}-${item.isClass ? 'cls' : item.isService ? 'srv' : 'prd'}-${index}`}
                      className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3"
                    >
                      <div className="flex-1">
                        <h4 className="font-semibold text-paper text-sm">{title}</h4>
                        <p className="text-xs text-muted">
                          {item.isClass ? 'Clase' : item.isService ? 'Servicio' : 'Producto'}
                        </p>
                        <p className="text-xs font-bold text-[#CCFF00] mt-1">
                          {price.toFixed(2)} €
                        </p>
                        
                        {/* Selector de cantidad */}
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => updateQuantity(item.id, item.isService, (item.quantity || 1) - 1)}
                            className="w-5 h-5 bg-white/10 rounded hover:bg-white/20 text-white flex items-center justify-center text-xs font-bold"
                          >
                            -
                          </button>
                          <span className="text-xs text-paper font-mono">{item.quantity || 1}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.isService, (item.quantity || 1) + 1)}
                            className="w-5 h-5 bg-white/10 rounded hover:bg-white/20 text-white flex items-center justify-center text-xs font-bold"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="text-right ml-4">
                        <p className="text-sm font-bold text-paper">
                          {(price * (item.quantity || 1)).toFixed(2)} €
                        </p>
                        <button
                          onClick={() => removeFromCart(item.id, item.isService)}
                          className="text-xs text-red-400 hover:text-red-300 mt-2 block"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Pie del Carrito / Botón de Pago con Stripe */}
          <div className="border-t border-white/10 pt-4 space-y-3">
            {totalPrice > 0 && (
              <div className="flex justify-between text-paper font-semibold text-base mb-2">
                <span>Total:</span>
                <span className="text-[#CCFF00] font-bold text-lg">{totalPrice.toFixed(2)} €</span>
              </div>
            )}

            {cart.length > 0 ? (
              <>
                <button
                  onClick={handleCheckout}
                  disabled={loading}
                  className="block w-full text-center rounded-md bg-[#CCFF00] py-3 text-sm font-bold uppercase tracking-widest text-ink transition hover:brightness-110 disabled:opacity-50"
                >
                  {loading ? "Procesando..." : "Pagar con Stripe / Bizum"}
                </button>
                <button
                  onClick={clearCart}
                  className="block w-full text-center text-xs text-muted hover:text-paper underline"
                >
                  Vaciar carrito
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsOpen(false)}
                className="block w-full text-center rounded-md bg-[#CCFF00] py-3 text-sm font-bold uppercase tracking-widest text-ink transition hover:brightness-110"
              >
                Explorar Tienda
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
