import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useCart } from '../context/CartContext';
import { supabase } from '../lib/supabaseClient'; // <-- 1. Importamos Supabase
import PayPalButton from './PayPalButton';

export default function CartFloating() {
  const router = useRouter();
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
  const [paypalDone, setPaypalDone] = useState(false);
  const [userId, setUserId] = useState(null); // <-- 2. Estado para guardar el ID del usuario
  const [userEmail, setUserEmail] = useState(null);

  // 3. Cargamos el usuario si ha iniciado sesión al abrir o cargar el componente
  useEffect(() => {
    async function getUser() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
        setUserEmail(session.user.email);
      }
    }
    getUser();
  }, []);

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
          userId: userId, // <-- 4. Enviamos el ID del usuario directamente a Stripe
          // Antes esto no se mandaba, así que un pedido hecho por carrito
          // (aunque el cliente estuviera logeado) dejaba el email de Stripe
          // en blanco y editable. Mandándolo, Stripe lo precarga y lo
          // bloquea igual que ya pasaba al comprar un solo artículo.
          userEmail: userEmail,
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

  // Registra en el historial (y envía los correos de confirmación) un
  // carrito completo pagado con PayPal, igual que ya hacía el botón de
  // PayPal de la ficha de producto individual (handlePaypalSuccess de
  // pages/tienda/[slug].js) pero para varios artículos a la vez. Después
  // manda al cliente a la misma página de "gracias"/briefing a la que ya
  // le mandaría Stripe si el pedido incluye un servicio y/o una clase.
  const handlePaypalSuccess = async (details) => {
    if (cart.length === 0) return;
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
          items: cart,
          userId: session?.user?.id || userId || null,
          userEmail: session?.user?.email || userEmail || payerEmail,
          payerEmail,
          payerName,
          paypalOrderId: details?.id || null,
        }),
      });
    } catch (err) {
      console.error('No se pudo registrar el pago de PayPal del carrito en el historial:', err);
    }

    // Mismo cálculo de "tipo" (orden fijo producto → servicio → clase) que
    // usa pages/api/checkout.js, para mandar a la misma página de gracias/
    // briefing que usaría Stripe con este mismo carrito.
    const hasProduct = cart.some((i) => !i.isClass && !i.isService);
    const hasService = cart.some((i) => !i.isClass && i.isService);
    const hasClass = cart.some((i) => i.isClass);
    const tipoParts = [];
    if (hasProduct) tipoParts.push('producto');
    if (hasService) tipoParts.push('servicio');
    if (hasClass) tipoParts.push('clase');
    const tipoQuery = tipoParts.length > 0 ? tipoParts.join('_') : 'producto';
    const totalCategorias = (hasProduct ? 1 : 0) + (hasService ? 1 : 0) + (hasClass ? 1 : 0);

    let destino = `/gracias?tipo=${tipoQuery}`;
    if (totalCategorias > 1) destino = `/briefing?tipo=${tipoQuery}`;
    else if (hasService) destino = `/servicios/briefing?tipo=${tipoQuery}`;
    else if (hasClass) destino = `/clases/briefing?tipo=${tipoQuery}`;

    clearCart();
    setIsOpen(false);
    router.push(destino);
  };

  // Icono del carrito vectorizado en alta precisión (ruedas perfectamente alineadas)
  const cartIconBlack = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='%23000000' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' viewBox='0 0 24 24'><path d='M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121 0 2.053-.825 2.196-1.94l.827-6.417a1.125 1.125 0 00-1.113-1.268H5.112M7.5 14.25L5.112 5.27M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z'/></svg>";

  // El carrito flotante no tiene ninguna función dentro del panel de
  // administración (ahí nunca se compra nada), así que no se muestra en
  // ninguna ruta que empiece por /admin.
  if (router.pathname.startsWith('/admin')) {
    return null;
  }

  return (
    <>
      {/* 1. BOTÓN FLOTANTE REDONDO #CCFF00 CON ICONO DE CARRITO LIMPIO Y ALINEADO */}
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Ver carrito"
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#CCFF00] shadow-xl shadow-[#CCFF00]/30 transition-all duration-200 hover:scale-110 active:scale-95"
      >
        <img 
          src={cartIconBlack} 
          alt="Carrito" 
          className="h-6 w-6 pointer-events-none select-none"
        />

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
                  style={{ 
                    color: '#000000', 
                    WebkitTextFillColor: '#000000',
                    forcedColorAdjust: 'none',
                    colorScheme: 'only light'
                  }}
                  className="block w-full text-center rounded-md bg-[#CCFF00] py-3 text-sm font-bold uppercase tracking-widest transition hover:brightness-110 disabled:opacity-50"
                >
                  <span style={{ color: '#000000', WebkitTextFillColor: '#000000' }}>
                    {loading ? "Procesando..." : "PAGAR CON STRIPE / BIZUM"}
                  </span>
                </button>

                {/* PayPal no admite pedidos de 0,00€, igual que en la ficha
                    de producto individual, así que solo se ofrece cuando el
                    carrito tiene un importe real. */}
                {totalPrice > 0 && !paypalDone && (
                  <>
                    <div className="relative flex py-1 items-center">
                      <div className="flex-grow border-t border-white/10"></div>
                      <span className="flex-shrink mx-3 text-muted text-xs uppercase font-semibold">O pagar con</span>
                      <div className="flex-grow border-t border-white/10"></div>
                    </div>
                    <div className="w-full relative z-10 min-h-[50px]">
                      <PayPalButton
                        amount={totalPrice}
                        currency={(cart[0]?.currency || cart[0]?.moneda || 'eur').toUpperCase()}
                        label={cart.map((i) => i.title || i.name || i.nombre || 'Artículo').join(' + ').slice(0, 120)}
                        onSuccess={handlePaypalSuccess}
                      />
                    </div>
                  </>
                )}

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
                style={{ 
                  color: '#000000', 
                  WebkitTextFillColor: '#000000',
                  forcedColorAdjust: 'none',
                  colorScheme: 'only light'
                }}
                className="block w-full text-center rounded-md bg-[#CCFF00] py-3 text-sm font-bold uppercase tracking-widest transition hover:brightness-110"
              >
                <span style={{ color: '#000000', WebkitTextFillColor: '#000000' }}>
                  EXPLORAR MÁS
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
