import { useState, useEffect } from 'react';
import Head from 'next/head';
import Seo from '../../components/Seo';
import { useRouter } from 'next/router';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import PayPalButton from '../../components/PayPalButton';
import { permitirPago } from '../../lib/disponibilidadClient';
import { supabase } from '../../lib/supabaseClient';
import { propsConObras } from '../../lib/obras';
import { aplicarOferta } from '../../lib/ofertas';
import { formatPrice } from '../../lib/format';
import { PrecioTachado, AvisoOferta } from '../../components/PrecioOferta';
import { interpretarDemo } from '../../lib/demo';
import OndaAudio from '../../components/OndaAudio';
import { useCart } from '../../context/CartContext';
import { cabecerasPago } from '../../lib/cabecerasPago';

// Muestra la demo según la web del enlace (ver lib/demo.js): reproductor de
// YouTube, Spotify, SoundCloud, Vimeo, Apple Music o Google Drive; el
// reproductor del navegador si es un archivo de audio; y para cualquier otra
// web, un botón que la abre en otra pestaña.
function ProductDemoPlayer({ demoUrl, fallbackCover }) {
  const demo = interpretarDemo(demoUrl);
  if (!demo) return null;

  return (
    <div className="mt-8 rounded-sm border border-white/10 bg-surface p-4 w-full">
      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-volt">Escuchar / Ver Demo</p>

      {demo.tipo === 'iframe' && demo.video && (
        <div className="relative aspect-video w-full overflow-hidden rounded-sm">
          <iframe
            src={demo.src}
            title={`Demo en ${demo.nombre}`}
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            loading="lazy"
          />
        </div>
      )}

      {demo.tipo === 'iframe' && !demo.video && (
        <iframe
          src={demo.src}
          title={`Demo en ${demo.nombre}`}
          width="100%"
          height={demo.alto || 152}
          frameBorder="0"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          className="rounded-sm"
        />
      )}

      {demo.tipo === 'audio' && (
        <OndaAudio src={demo.src} portada={fallbackCover} />
      )}

      {demo.tipo === 'enlace' && (
        <a
          href={demo.src}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block rounded-sm border border-volt px-5 py-3 text-xs font-bold uppercase tracking-widest text-volt transition hover:bg-volt hover:text-black"
        >
          Abrir la demo ↗
        </a>
      )}
    </div>
  );
}

export default function ProductoDetalle({ product }) {
  const router = useRouter();
  const { addToCart } = useCart();
  const [loading, setLoading] = useState(false);
  const [paypalDone, setPaypalDone] = useState(false);
  const stripeSuccess = router.query.compra === 'exito';
  const purchaseDone = paypalDone || stripeSuccess;

  // Necesario para el artículo gratuito (0€): ese pedido no pasa por la
  // pasarela de Stripe (se salta directamente a "gracias"), así que si el
  // visitante no tiene sesión iniciada, antes no se pedía ningún correo en
  // ningún punto del proceso y el pedido se guardaba sin forma de contactar
  // ni de enviar el enlace de descarga al cliente. Ahora, para un producto
  // gratis y sin sesión iniciada, se pide el correo aquí mismo antes de
  // continuar.
  const [loggedInEmail, setLoggedInEmail] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [freeEmail, setFreeEmail] = useState('');
  const [freeEmailError, setFreeEmailError] = useState('');

  useEffect(() => {
    async function getUser() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.email) setLoggedInEmail(session.user.email);
      } finally {
        setCheckingSession(false);
      }
    }
    getUser();
  }, []);

  const esGratis = !product?.price_cents;
  const necesitaCorreoManual = esGratis && !loggedInEmail;

  if (!product) {
    return (
      <>
        <Navbar />
        <div className="mx-auto max-w-6xl px-5 py-24 text-center">
          <p className="text-muted">Este producto no existe o ya no está disponible.</p>
        </div>
        <Footer />
      </>
    );
  }

  async function buyWithStripe() {
    setFreeEmailError('');

    // Para un producto gratis (0€) no hay pasarela de pago de por medio, así
    // que si no hay sesión iniciada necesitamos el correo del visitante
    // aquí mismo: sin él, el pedido se guarda pero nunca le llegaría el
    // enlace de descarga.
    if (necesitaCorreoManual) {
      const correoLimpio = freeEmail.trim();
      const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoLimpio);
      if (!emailValido) {
        setFreeEmailError('Introduce un correo electrónico válido para poder enviarte la descarga.');
        return;
      }
    }

    setLoading(true);
    try {
      // Adjuntamos el usuario logueado (si lo hay) para que el historial
      // del área de clientes pueda asociarle la compra desde el primer
      // momento, igual que ya ocurre con las compras hechas por carrito.
      const { data: { session } } = await supabase.auth.getSession();
      const correoFinal = session?.user?.email || (necesitaCorreoManual ? freeEmail.trim() : null);

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: await cabecerasPago(),
        body: JSON.stringify({
          productId: product.id,
          returnUrl: window.location.href,
          userId: session?.user?.id || null,
          userEmail: correoFinal,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'No se ha podido iniciar el pago. Inténtalo de nuevo.');
        setLoading(false);
      }
    } catch (err) {
      alert('No se ha podido iniciar el pago. Inténtalo de nuevo.');
      setLoading(false);
    }
  }

  // Registra en el historial del área de clientes (y envía los correos de
  // confirmación) una compra pagada con PayPal. Antes, pagar con PayPal
  // aquí no dejaba ningún rastro en "purchases".
  async function handlePaypalSuccess(details) {
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
          tipo: 'producto',
          itemId: product.id,
          userId: session?.user?.id || null,
          userEmail: session?.user?.email || payerEmail,
          payerEmail,
          payerName,
          paypalOrderId: details?.id || null,
        }),
      });
    } catch (err) {
      console.error('No se pudo registrar el pago de PayPal en el historial:', err);
    }
  }

  return (
    <>
      <Seo
        title={`${product.name} — The Lab`}
        description={product.description || `${product.name}: kit de producción de The Lab by Hottie.`}
        path={`/tienda/${product.slug}`}
        image={product.image_url}
        type="product"
      />

      <Navbar />

      <section className="mx-auto grid max-w-6xl gap-10 px-5 py-16 md:grid-cols-2">
        <div className="aspect-square overflow-hidden rounded-sm border border-white/10 bg-surface2">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted">Sin imagen</div>
          )}
        </div>

        <div className="w-full max-w-md">
          {/* Título y Botón +CARRITO delimitados dentro del max-w-md */}
          <div className="flex items-center justify-between gap-4">
            <h1 className="font-display text-4xl tracking-wide text-paper">{product.name}</h1>
            <button
              onClick={() => addToCart(product, false)}
              className="rounded-sm border border-[#CCFF00] px-3 py-2 text-xs uppercase font-bold tracking-widest text-[#CCFF00] transition hover:bg-[#CCFF00] hover:text-black shrink-0"
            >
              + CARRITO
            </button>
          </div>

          <p className="mt-3 text-2xl text-signal">
            {product.oferta && <PrecioTachado cents={product.oferta.precio_original_cents} currency={product.currency} />}
            {formatPrice(product.price_cents, product.currency)}
          </p>
          {product.oferta && <AvisoOferta fin={product.oferta.fin} className="mt-2" />}
          <p className="mt-6 whitespace-pre-line leading-relaxed text-muted">{product.description}</p>

          <div className="mt-8 flex flex-col gap-5 w-full">
            {!purchaseDone ? (
              <>
                {necesitaCorreoManual && !checkingSession && (
                  <div>
                    <label className="mb-1 block text-xs uppercase tracking-widest text-muted">
                      Tu correo electrónico (para enviarte la descarga)
                    </label>
                    <input
                      type="email"
                      required
                      value={freeEmail}
                      onChange={(e) => { setFreeEmail(e.target.value); setFreeEmailError(''); }}
                      placeholder="tu@email.com"
                      className="w-full rounded-sm border border-white/20 bg-surface2 px-4 py-2 text-paper focus:border-volt focus:outline-none"
                    />
                    {freeEmailError && (
                      <p className="mt-1 text-xs text-red-400">{freeEmailError}</p>
                    )}
                  </div>
                )}

                <button
                  onClick={buyWithStripe}
                  disabled={loading || checkingSession}
                  className="w-full rounded-sm bg-volt px-6 py-4 text-sm font-semibold uppercase tracking-widest text-ink transition hover:brightness-110 disabled:opacity-50"
                >
                  {loading ? 'Redirigiendo…' : (product.price_cents ? 'Pagar con tarjeta y más' : 'Obtener gratis')}
                </button>

                {/* PayPal no admite pedidos de 0,00€ (el botón se queda sin
                    abrir el login y el pedido nunca llega a registrarse),
                    así que para un producto gratuito solo se ofrece el
                    botón de arriba, que ya gestiona bien el precio 0€. */}
                {product.price_cents > 0 && (
                  <>
                    <div className="relative flex py-1 items-center">
                      <div className="flex-grow border-t border-white/10"></div>
                      <span className="flex-shrink mx-3 text-muted text-xs uppercase font-semibold">O pagar con</span>
                      <div className="flex-grow border-t border-white/10"></div>
                    </div>

                    <div className="w-full relative z-10 min-h-[50px]">
                      <PayPalButton
                        amount={product.price_cents / 100}
                        currency={(product.currency || 'eur').toUpperCase()}
                        label={product.name}
                        onSuccess={handlePaypalSuccess}
                        checkBeforePay={() => permitirPago([])}
                      />
                    </div>
                  </>
                )}
              </>
            ) : (
              <p className="rounded-sm border border-signal/40 bg-signal/10 p-4 text-sm text-signal">
                ¡Pago completado! {stripeSuccess ? 'Revisa tu correo para el recibo.' : 'Revisa tu correo de PayPal para el recibo.'}
                {product.file_url && (
                  <a href={product.file_url} className="underline ml-2">
                    Descargar ahora
                  </a>
                )}
              </p>
            )}
          </div>

          {/* Reproductor dentro del mismo ancho */}
          <ProductDemoPlayer demoUrl={product.demo_url} fallbackCover={product.image_url} />
        </div>
      </section>

      <Footer />
    </>
  );
}

export async function getServerSideProps({ params, res }) {
  const { data } = await supabase
    .from('products')
    .select('*')
    .eq('slug', params.slug)
    .eq('active', true)
    .single();

  // Si no existe o está despublicado: página 404 de verdad (pages/404.js),
  // para que Google lo quite de sus resultados.
  if (!data) return { notFound: true };

  return propsConObras(supabase, res, { product: aplicarOferta(data) || null }, { tienda: true });
}
