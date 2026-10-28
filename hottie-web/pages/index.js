import Head from 'next/head';
import Seo from '../components/Seo';
import Link from 'next/link';
import { useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import BrandsBanner from '../components/BrandsBanner';
import TextoDescifrado from '../components/TextoDescifrado';
import { Contador, Aparecer, FondoOndas } from '../components/Animaciones';
import Turnstile from '../components/Turnstile';

export default function Home() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  // Campo invisible anti-bots del boletín (las personas no lo ven).
  const [trampaBots, setTrampaBots] = useState('');
  // Comprobación anti-bots de Cloudflare (components/Turnstile.js)
  const [tokenTurnstile, setTokenTurnstile] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Datos estructurados JSON-LD con conexión a perfiles oficiales
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "The Lab by Hottie",
    "alternateName": ["Hottieprod", "hottieprodthis", "The Lab"],
    "url": "https://www.hottieprodthis.com/",
    "publisher": {
      "@type": "Organization",
      "name": "The Lab by Hottie",
      "logo": {
        "@type": "ImageObject",
        "url": "https://www.hottieprodthis.com/favicon.png"
      },
      "sameAs": [
        "https://www.instagram.com/hottieprodthis/",
        "https://muso.ai/profile/6f3664ee-3a33-4b81-aeda-d228ac88b0e7"
      ]
    }
  };

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setErrorMessage('');
    setSubscribed(false);

    try {
      // El alta la hace el servidor (pages/api/boletin.js): manda un correo
      // para confirmar y solo entra en la lista si se confirma. "web" es el
      // campo invisible anti-bots.
      const res = await fetch('/api/boletin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, web: trampaBots, turnstile: tokenTurnstile }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setSubscribed(true);
        setEmail('');
      } else {
        setErrorMessage(data.error || 'Hubo un problema al guardar tu correo. Inténtalo de nuevo.');
      }
    } catch (err) {
      console.error('Error al suscribir:', err);
      setErrorMessage('Ocurrió un error inesperado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Seo
        title="The Lab by Hottie | Estudio Profesional"
        description="The Lab es el estudio de producción musical, mezcla y mastering de Hottie (Hottieprod) en Salamanca. Especializado en tech house, electrónica, latina y urbana."
        path="/"
      />
      <Head>
        <meta name="keywords" content="hottie, the lab, hottieprod, hottieprodthis, productor musical, the lab hottie, estudio de grabacion, salamanca, dj" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
        />
      </Head>

      {/* Título invisible para SEO */}
      <h1 className="sr-only">The Lab - Estudio de Producción Musical por Hottie (Hottieprod)</h1>

      <Navbar />

      <section className="relative overflow-hidden border-b border-white/10">
        <FondoOndas />
        <div className="relative z-10 mx-auto flex max-w-6xl flex-col items-start gap-6 px-5 py-24 md:py-32">
          <div className="waveform" aria-hidden="true">
            {Array.from({ length: 8 }).map((_, i) => (
              <span key={i} />
            ))}
          </div>

          <h2 className="font-display text-6xl tracking-wide text-paper md:text-8xl leading-[0.95]">
            <TextoDescifrado texto="TU PRÓXIMO HIT" />
            <br />
            <span className="text-volt"><TextoDescifrado texto="COMIENZA AQUÍ." retraso={350} /></span>
          </h2>

          <p className="max-w-xl text-lg text-muted font-body leading-relaxed">
            Transforma tu estudio en un laboratorio de sonido sin límites. Kits de producción, mezcla, masterización y clases personalizadas para convertir cualquier idea en un lanzamiento profesional.
          </p>

          <div className="flex flex-wrap gap-4 pt-2">
            <Link
              href="/tienda"
              className="rounded-sm bg-volt px-6 py-3 text-sm font-semibold uppercase tracking-widest text-ink transition hover:brightness-110 hover:shadow-[0_0_28px_rgba(204,255,0,0.55)]"
            >
              Ver tienda
            </Link>
            <Link
              href="/servicios"
              className="rounded-sm border border-white/20 px-6 py-3 text-sm font-semibold uppercase tracking-widest text-paper transition hover:border-paper hover:shadow-[0_0_28px_rgba(242,240,234,0.35)]"
            >
              Ver servicios
            </Link>
            <Link
              href="/clases"
              className="rounded-sm border border-volt px-6 py-3 text-sm font-semibold uppercase tracking-widest text-volt transition hover:bg-volt hover:text-ink hover:shadow-[0_0_28px_rgba(204,255,0,0.55)]"
            >
              Ver clases
            </Link>
          </div>
        </div>
      </section>

      {/* SECCIÓN SOBRE HOTTIE + NEWSLETTER */}
      <Aparecer>
      <section className="mx-auto max-w-4xl px-5 py-20 text-center">
        <div className="mx-auto mb-8 h-36 w-36 overflow-hidden rounded-full border-2 border-volt/40 p-1 shadow-lg shadow-volt/10">
          <img
            src="/sobre-mi-imagen.jpeg"
            alt="Hottieprod - Productor Musical"
            className="h-full w-full rounded-full object-cover"
          />
        </div>

        <h2 className="font-display text-4xl tracking-wide text-paper mb-6 uppercase">
          Sobre Hottie
        </h2>

        {/* Cifras destacadas: cuentan desde 0 al aparecer en pantalla */}
        <div className="mx-auto mb-10 grid max-w-2xl grid-cols-3 gap-4">
          {[
            { hasta: 100, antes: '+', texto: 'Producciones' },
            { hasta: 20, antes: '+', despues: 'M', texto: 'Visualizaciones' },
            { hasta: new Date().getFullYear() - 2012, antes: '+', texto: 'Años produciendo' },
          ].map((c) => (
            <div key={c.texto}>
              <p className="font-display text-5xl leading-none text-volt md:text-6xl">
                <Contador hasta={c.hasta} antes={c.antes} despues={c.despues} />
              </p>
              <p className="mt-2 font-body text-[11px] uppercase tracking-widest text-muted md:text-xs">{c.texto}</p>
            </div>
          ))}
        </div>

        <div className="mx-auto max-w-2xl space-y-4 font-body text-base text-muted leading-relaxed">
          <p>
            Hottie es un Productor, Ingeniero y Dj de origen Español con residencia en Salamanca especializado en música electrónica, latina y tribal.
          </p>
          <p>
            Hottie comenzó a producir a principios de 2012 hasta que en 2018 decidió crear su marca personal, llevando consigo la música electro/latina a su terreno en otro nivel.
          </p>
          <p>
            A lo largo de su carrera acumula más de <strong className="text-paper font-semibold">100 producciones</strong> de más de <strong className="text-paper font-semibold">20M de visualizaciones</strong> trabajando con diferentes artistas como <span className="text-paper font-medium">El Jincho, Saiko, Lucho SSJ, Denyerkin, Kristina, Yeieme, Ritnes, Young Class, Escudero y Karlitos</span> entre muchos más...
          </p>
        </div>

        {/* BOTÓN PERFIL MUSO.AI */}
        <div className="mt-10 flex justify-center">
          <a
            href="https://muso.ai/profile/6f3664ee-3a33-4b81-aeda-d228ac88b0e7"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col items-center gap-2 transition hover:scale-105"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <div 
              className="flex h-14 w-14 items-center justify-center rounded-full bg-volt text-ink shadow-lg shadow-volt/20 overflow-hidden"
              style={{
                forcedColorAdjust: 'none',
                colorScheme: 'only light'
              }}
            >
              <img
                src="/muso.png"
                alt="Muso.ai"
                className="h-full w-full object-contain brightness-0 scale-150"
              />
            </div>
            <span className="font-body text-sm font-bold uppercase tracking-wider text-paper transition duration-200 group-hover:text-volt">
              VER CRÉDITOS
            </span>
          </a>
        </div>

        <div className="mt-10 mx-auto max-w-md rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <form onSubmit={handleSubscribe} className="space-y-3">
            {/* Trampa anti-bots: oculta para las personas, los bots la rellenan. */}
            <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', width: '1px', height: '1px', overflow: 'hidden' }}>
              <label>
                No rellenar
                <input type="text" name="web" tabIndex={-1} autoComplete="off" value={trampaBots} onChange={(e) => setTrampaBots(e.target.value)} />
              </label>
            </div>
            <div className="flex gap-2">
              <input
                type="email"
                required
                placeholder="Tu dirección de correo electrónico"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-white/20 bg-ink px-4 py-3 text-sm text-paper placeholder-muted focus:border-volt focus:outline-none transition"
              />
              <button
                type="submit"
                disabled={loading}
                aria-label="Suscribirse"
                className="flex items-center justify-center rounded-md bg-volt px-5 py-3 text-ink font-bold transition hover:bg-signal disabled:opacity-50"
              >
                {loading ? '...' : '➔'}
              </button>
            </div>
            <p className="text-xs text-muted font-body text-left">
              Recibe información sobre nuevos productos o servicios directamente en tu bandeja de entrada
            </p>
            <Turnstile onToken={setTokenTurnstile} />
          </form>

          {subscribed && (
            <p className="mt-3 text-sm font-semibold text-signal">
              ¡Casi listo! Te hemos enviado un correo: pulsa «Confirmar» para empezar a recibir las novedades (mira también en spam).
            </p>
          )}

          {errorMessage && (
            <p className="mt-3 text-sm font-semibold text-red-400">
              {errorMessage}
            </p>
          )}
        </div>
      </section>
      </Aparecer>

      {/* SECCIÓN TRABAJOS DESTACADOS */}
      <section className="mx-auto max-w-6xl px-5 py-16 border-t border-white/10 space-y-16 font-body">
        <Aparecer>
        <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-2">
          <div className="space-y-4 text-left">
            <h3 className="font-display text-2xl font-bold tracking-wide text-paper md:text-3xl">
              Ahora by Escudero
            </h3>
            <p className="text-sm leading-relaxed text-muted md:text-base">
              Escudero, artista residente en Málaga, es uno de los compositores principales con los que trabaja Hottie.
            </p>
            <p className="text-sm leading-relaxed text-muted md:text-base">
              Este EP en específico ha sido producido, compuesto, grabado, masterizado y mezclado exclusivamente por el equipo completo.
            </p>
          </div>

          <div className="relative aspect-video overflow-hidden rounded-lg border border-white/10 bg-black/40 shadow-xl">
            <iframe
              className="h-full w-full"
              src="https://www.youtube.com/embed/videoseries?list=PLbaFqVI9n3hphDGXDfQ_0VhnZfal0pMhi"
              title="Ahora by Escudero - Playlist"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            ></iframe>
          </div>
        </div>
        </Aparecer>

        <Aparecer>
        <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-2">
          <div className="order-2 md:order-1 relative aspect-video overflow-hidden rounded-lg border border-white/10 bg-black/40 shadow-xl">
            <iframe
              className="h-full w-full"
              src="https://www.youtube.com/embed/videoseries?list=PL6xkZFhZM7tBz6lWQRm7AVv0_fycRYN0Y"
              title="Conexiones by Karlitos - Playlist"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            ></iframe>
          </div>

          <div className="order-1 md:order-2 space-y-4 text-left">
            <h3 className="font-display text-2xl font-bold tracking-wide text-paper md:text-3xl">
              Conexiones by Karlitos
            </h3>
            <p className="text-sm leading-relaxed text-muted md:text-base">
              &quot;Conexiones&quot; es uno de los trabajos completamente producidos, mezclados y masterizados por Hottie de la mano del artista Sevillano Karlitos. Se trata de un pequeño EP de 6 canciones con estilos como Trap, Drill, Reggaeton, Pop, etc...
            </p>
          </div>
        </div>
        </Aparecer>
      </section>

      {/* BANNER DE MARCAS (VERDE VOLT) */}
      <Aparecer>
        <BrandsBanner />
      </Aparecer>

      <Footer />
    </>
  );
}
