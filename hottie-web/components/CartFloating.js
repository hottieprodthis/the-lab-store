import { useState } from 'react';
import Link from 'next/link';

export default function CartFloating({ cartItems = [], onRemoveItem }) {
  const [isOpen, setIsOpen] = useState(false);

  // Calcula el total si los items tienen precio
  const total = cartItems.reduce((acc, item) => acc + (Number(item.price) || 0), 0);

  return (
    <>
      {/* 1. BOTÓN FLOTANTE REDONDO #CCFF00 CON CARRITO BLANCO */}
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Ver carrito"
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#CCFF00] text-white shadow-xl shadow-[#CCFF00]/30 transition-all duration-200 hover:scale-110 active:scale-95"
      >
        {/* Ícono de Carrito (Blanco) */}
        <svg
          className="h-7 w-7 text-white"
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

        {/* Contador de artículos (burbuja flotante) */}
        {cartItems.length > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow">
            {cartItems.length}
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
                Tus Artículos ({cartItems.length})
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
              {cartItems.length === 0 ? (
                <div className="py-12 text-center text-muted font-body">
                  <p>Tu selección está vacía.</p>
                  <p className="text-xs mt-2">Navega por la tienda o servicios para añadir artículos.</p>
                </div>
              ) : (
                cartItems.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3"
                  >
                    <div>
                      <h4 className="font-semibold text-paper text-sm">{item.title}</h4>
                      <p className="text-xs text-muted">{item.category || 'Servicio / Producto'}</p>
                      {item.price && (
                        <p className="text-xs font-bold text-[#CCFF00] mt-1">{item.price} €</p>
                      )}
                    </div>
                    {onRemoveItem && (
                      <button
                        onClick={() => onRemoveItem(index)}
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Pie del Carrito / Botón de Acción */}
          <div className="border-t border-white/10 pt-4 space-y-3">
            {total > 0 && (
              <div className="flex justify-between text-paper font-semibold text-base mb-2">
                <span>Total estimado:</span>
                <span className="text-[#CCFF00]">{total.toFixed(2)} €</span>
              </div>
            )}

            <Link
              href={cartItems.length > 0 ? "/contacto" : "/tienda"}
              onClick={() => setIsOpen(false)}
              className="block w-full text-center rounded-md bg-[#CCFF00] py-3 text-sm font-bold uppercase tracking-widest text-ink transition hover:brightness-110"
            >
              {cartItems.length > 0 ? "Solicitar / Finalizar pedido" : "Explorar Tienda"}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
