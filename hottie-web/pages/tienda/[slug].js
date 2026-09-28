import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import PayPalButton from '../../components/PayPalButton';
import { supabase } from '../../lib/supabaseClient';
import { formatPrice } from '../../lib/format';
import { useCart } from '../../context/CartContext';

function ProductDemoPlayer({ demoUrl, fallbackCover }) {
  if (!demoUrl) return null;

  const isSpotify = demoUrl.includes('spotify.com');
  const isYouTube = demoUrl.includes('youtube.com') || demoUrl.includes('youtu.be');

  const getYouTubeEmbedUrl = (url) => {
    let videoId = '';
    if (url.includes('youtu.be/')) videoId = url.split('youtu.be/')[1]?.split('?')[0];
    else if (url.includes('v=')) videoId = url.split('v=')[1]?.split('&')[0];
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  };

  const getSpotifyEmbedUrl = (url) => {
    return url.replace('open.spotify.com/', 'open.spotify.com/embed/');
  };

  return (
    <div className="mt-8 rounded-sm border border-white/10 bg-surface p-4 w-full">
      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-volt">Escuchar / Ver Demo</p>
      
      {isSpotify && (
        <iframe
          src={getSpotifyEmbedUrl(demoUrl)}
          width="100%"
          height="152"
          frameBorder="0"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          className="rounded-sm"
        />
      )}

      {isYouTube && getYouTubeEmbedUrl(demoUrl) && (
        <div className="relative aspect-video w-full overflow-hidden rounded-sm">
          <iframe
            src={getYouTubeEmbedUrl(demoUrl)}
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      {!isSpotify && !isYouTube && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {fallbackCover && (
            <img src={fallbackCover} alt="Portada" className="h-16 w-16 rounded-sm object-cover" />
          )}
          <audio controls className="w-full">
            <source src={demoUrl} />
            Tu navegador no soporta el reproductor de audio.
          </audio>
        </div>
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
        headers: { 'Content-Type': 'application/json' },
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
      <Head>
        <title>{product.name} — The Lab</title>
        <meta name="description" content={product.description?.slice(0, 150)} />
      </Head>

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

          <p className="mt-3 text-2xl text-signal">{formatPrice(product.price_cents, product.currency)}</p>
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
                  {loading ? 'Redirigiendo…' : (product.price_cents ? 'Comprar con tarjeta' : 'Obtener gratis')}
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

export async function getServerSideProps({ params }) {
  const { data } = await supabase
    .from('products')
    .select('*')
    .eq('slug', params.slug)
    .eq('active', true)
    .single();

  return { props: { product: data || null } };
}
