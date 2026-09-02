import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { supabase } from '../lib/supabaseClient';

export default function Home() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setErrorMessage('');
    setSubscribed(false);

    try {
      const emailLimpio = email.trim().toLowerCase();

      // 1. Comprobar si el correo ya existe en la base de datos
      const { data: existente } = await supabase
        .from('suscriptores')
        .select('email')
        .eq('email', emailLimpio)
        .maybeSingle();

      if (existente) {
        setErrorMessage('Este correo electrónico ya está suscrito.');
        setLoading(false);
        return;
      }

      // 2. Si no existe, lo insertamos como un nuevo suscriptor
      const { error } = await supabase
        .from('suscriptores')
        .insert([{ email: emailLimpio }]);

      if (error) {
        console.error('Detalle del error en Supabase:', error);
        if (error.code === '23505') {
          setErrorMessage('Este correo electrónico ya está suscrito.');
        } else {
          setErrorMessage('Hubo un problema al guardar tu correo. Inténtalo de nuevo.');
        }
      } else {
        setSubscribed(true);
        setEmail('');
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
      <Head>
        <title>The Lab – Hottie</title>
        <meta
          name="description"
          content="Hottie: laboratorio de sonido sin límites. Kits de producción, mezcla, masterización y clases personalizadas."
        />
      </Head>

      <Navbar />

      <section className="relative overflow-hidden border-b border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-5 py-24 md:py-32">
          {/* ONDA DE FIRMA DE LA MARCA */}
          <div className="waveform" aria-hidden="true">
            {Array.from({ length: 8 }).map((_, i) => (
              <span key={i} />
            ))}
          </div>

          {/* TITULAR PRINCIPAL (H1) */}
          <h1 className="font-display text-6xl tracking-wide text-paper md:text-8xl leading-[0.95]">
            TU PRÓXIMO HIT
            <br />
            <span className="text-volt">COMIENZA AQUÍ.</span>
          </h1>

          {/* SUBTÍTULO */}
          <p className="max-w-xl text-lg text-muted font-body leading-relaxed">
            Transforma tu estudio en un laboratorio de sonido sin límites. Kits de producción, mezcla, masterización y clases personalizadas para convertir cualquier idea en un lanzamiento profesional.
          </p>

          {/* BOTONES DE ACCIÓN */}
          <div className="flex flex-wrap gap-4 pt-2">
            <Link
              href="/tienda"
              className="rounded-sm bg-volt px-6 py-3 text-sm font-semibold uppercase tracking-widest text-ink transition hover:brightness-110"
            >
              Ver tienda
            </Link>
            <Link
              href="/servicios"
              className="rounded-sm border border-white/20 px-6 py-3 text-sm font-semibold uppercase tracking-widest text-paper transition hover:border-signal hover:text-signal"
            >
              Ver servicios
            </Link>
          </div>
        </div>
      </section>

      {/* SECCIÓN SOBRE HOTTIE + NEWSLETTER */}
      <section className="mx-auto max-w-4xl px-5 py-20 text-center">
        {/* FOTO REDONDA DE TU HARDWARE */}
        <div className="mx-auto mb-8 h-36 w-36 overflow-hidden rounded-full border-2 border-volt/40 p-1 shadow-lg shadow-volt/10">
          <img
            src="/sobre-mi-imagen.jpeg"
            alt="Sobre Hottie"
            className="h-full w-full rounded-full object-cover"
          />
        </div>

        <h2 className="font-display text-4xl tracking-wide text-paper mb-6 uppercase">
          Sobre Hottie
        </h2>

        {/* BIOGRAFÍA EXACTA */}
        <div className="mx-auto max-w-2xl space-y-4 font-body text-base text-muted leading-relaxed">
          <p>
            Hottie es un Productor, Ingeniero y Dj de origen Español con residencia en Salamanca especializado en música electrónica, latina y tribal.
          </p>
          <p>
            Hottie comenzó a producir a principios de 2012 hasta que en 2018 decidió crear su marca personal, llevando consigo la música electro/latina a su terreno en otro nivel.
          </p>
          <p>
            A lo largo de su carrera acumula más de <strong className="text-paper font-semibold">100 producciones</strong> de más de <strong className="text-paper font-semibold">20M de visualizaciones</strong> trabajando con diferentes artistas como <span className="text-paper font-medium">El Jincho, Saiko, Lucho SSJ, Denyerkin, Alejo Marín, Yeieme, Ritnes, Young Class, Escudero y Karlitos</span> entre muchos más...
          </p>
        </div>

        {/* CUADRO DE CORREO / NEWSLETTER */}
        <div className="mt-14 mx-auto max-w-md rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <form onSubmit={handleSubscribe} className="space-y-3">
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
          </form>

          {subscribed && (
            <p className="mt-3 text-sm font-semibold text-signal">
              ¡Gracias! Te avisaremos cuando subamos nuevos productos o servicios.
            </p>
          )}

          {errorMessage && (
            <p className="mt-3 text-sm font-semibold text-red-400">
              {errorMessage}
            </p>
          )}
        </div>
      </section>

      {/* SECCIÓN TRABAJOS DESTACADOS (DESPUÉS DE NEWSLETTER) */}
      <section className="mx-auto max-w-6xl px-5 py-16 border-t border-white/10 space-y-16 font-body">
        {/* BLOQUE 1: Texto Izquierda | YouTube Derecha */}
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

        {/* BLOQUE 2: YouTube Izquierda | Texto Derecha */}
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
      </section>

      <Footer />
    </>
  );
}
