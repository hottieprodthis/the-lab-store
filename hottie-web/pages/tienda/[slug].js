import { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import PayPalButton from '../../components/PayPalButton';
import { supabase } from '../../lib/supabaseClient';
import { formatPrice } from '../../lib/format';

function ProductDemoPlayer({ demoUrl, demoCover }) {
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
    <div className="mt-8 rounded-sm border border-white/10 bg-surface p-4">
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
          {demoCover && (
            <img src={demoCover} alt="Demo Cover" className="h-16 w-16 rounded-sm object-cover" />
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
  const [loading, setLoading] = useState(false);
  const [paypalDone, setPaypalDone] = useState(false);
  const stripeSuccess = router.query.compra === 'exito';
  const purchaseDone = paypalDone || stripeSuccess;

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
    setLoading(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id }),
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

        <div>
          <h1 className="font-display text-4xl tracking-wide text-paper">{product.name}</h1>
          <p className="mt-3 text-2xl text-signal">{formatPrice(product.price_cents, product.currency)}</p>
          <p className="mt-6 whitespace-pre-line leading-relaxed text-muted">{product.description}</p>

          {/* Reproductor de Demo si el producto tiene demo_url */}
          <ProductDemoPlayer demoUrl={product.demo_url} demoCover={product.demo_cover} />

          <div className="mt-8 flex flex-col gap-5 w-full max-w-md">
            {!purchaseDone ? (
              <>
                <button
                  onClick={buyWithStripe}
                  disabled={loading}
                  className="w-full rounded-sm bg-volt px-6 py-4 text-sm font-semibold uppercase tracking-widest text-ink transition hover:brightness-110 disabled:opacity-50"
                >
                  {loading ? 'Redirigiendo…' : 'Comprar con tarjeta'}
                </button>

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
                    onSuccess={() => setPaypalDone(true)}
                  />
                </div>
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
