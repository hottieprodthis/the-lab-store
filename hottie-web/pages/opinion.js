import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

// Página para dejar una opinión sobre una compra. Se llega con el enlace
// personal del correo o del área de cliente (pages/api/opinion.js).
function Estrellas({ valor, onChange }) {
  const [encima, setEncima] = useState(0);
  return (
    <div className="flex justify-center gap-2" onMouseLeave={() => setEncima(0)}>
      {[1, 2, 3, 4, 5].map((n) => {
        const llena = n <= (encima || valor);
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            onMouseEnter={() => setEncima(n)}
            aria-label={`${n} ${n === 1 ? 'estrella' : 'estrellas'}`}
            className={`text-4xl transition ${llena ? 'text-volt scale-110' : 'text-white/20 hover:text-white/40'}`}
          >
            ★
          </button>
        );
      })}
    </div>
  );
}

export default function DejarOpinion() {
  const router = useRouter();
  const { c, t } = router.query;
  const [info, setInfo] = useState(null); // { articulo, yaOpinada } | { error }
  const [estrellas, setEstrellas] = useState(0);
  const [nombre, setNombre] = useState('');
  const [texto, setTexto] = useState('');
  const [estado, setEstado] = useState('inicio'); // inicio | enviando | hecho
  const [error, setError] = useState('');

  useEffect(() => {
    if (!router.isReady) return;
    if (!c || !t) return setInfo({ error: 'El enlace no es válido. Ábrelo desde el correo que te enviamos.' });
    fetch(`/api/opinion?c=${encodeURIComponent(c)}&t=${encodeURIComponent(t)}`)
      .then((r) => r.json())
      .then((d) => setInfo(d))
      .catch(() => setInfo({ error: 'Error de conexión. Recarga la página.' }));
  }, [router.isReady, c, t]);

  async function enviar(e) {
    e.preventDefault();
    setError('');
    if (!estrellas) return setError('Elige de 1 a 5 estrellas.');
    setEstado('enviando');
    try {
      const r = await fetch('/api/opinion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ c, t, nombre, texto, estrellas }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok) return setEstado('hecho');
      setEstado('inicio');
      setError(d.error || 'No se pudo enviar.');
    } catch (err) {
      setEstado('inicio');
      setError('Error de conexión. Inténtalo de nuevo.');
    }
  }

  return (
    <>
      <Head>
        <title>Tu opinión | The Lab – Hottie</title>
        <meta name="robots" content="noindex" />
      </Head>
      <Navbar />

      <main className="mx-auto max-w-xl px-5 py-20 text-center text-paper">
        <h1 className="font-display text-4xl uppercase tracking-wide text-volt">Tu opinión cuenta</h1>

        {!info ? null : info.error ? (
          <p className="mt-6 text-muted">{info.error}</p>
        ) : info.yaOpinada || estado === 'hecho' ? (
          <div className="mt-6 space-y-4">
            <p className="text-muted">
              ¡Gracias! Hemos recibido tu opinión sobre <strong className="text-paper">{info.articulo}</strong>. Saldrá en la web
              en cuanto la revisemos.
            </p>
            <Link href="/" className="inline-block text-sm text-volt underline">
              Volver al inicio
            </Link>
          </div>
        ) : (
          <form onSubmit={enviar} className="mt-6 space-y-6 text-left">
            <p className="text-center text-muted">
              ¿Qué tal fue <strong className="text-paper">{info.articulo}</strong>? Tu opinión ayuda a otros artistas a decidirse.
            </p>
            <Estrellas valor={estrellas} onChange={setEstrellas} />
            <div>
              <label className="mb-1 block text-xs uppercase tracking-widest text-muted">Tu nombre o nombre artístico</label>
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                maxLength={60}
                required
                className="w-full rounded-sm border border-white/20 bg-surface2 px-4 py-3 text-paper focus:border-volt focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-widest text-muted">Tu opinión</label>
              <textarea
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                rows={5}
                maxLength={1000}
                required
                placeholder="¿Cómo fue trabajar con Hottie? ¿Qué te pareció el resultado?"
                className="w-full rounded-sm border border-white/20 bg-surface2 px-4 py-3 text-paper focus:border-volt focus:outline-none"
              />
              <p className="mt-1 text-right text-[11px] text-muted">{texto.length}/1000</p>
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={estado === 'enviando'}
              className="w-full rounded-sm bg-volt px-6 py-3 text-sm font-semibold uppercase tracking-widest text-ink transition hover:brightness-110 hover:shadow-[0_0_28px_rgba(204,255,0,0.55)] disabled:opacity-50"
            >
              {estado === 'enviando' ? 'Enviando…' : 'Enviar mi opinión'}
            </button>
            <p className="text-center text-[11px] text-muted">
              Solo se publicarán tu nombre, las estrellas y el texto. Nunca tu email.
            </p>
          </form>
        )}
      </main>

      <Footer />
    </>
  );
}

// Con la web en modo "solo portada y contacto" (panel → Web en obras) esta
// página se tapa con el aviso de obras (lib/obras.js).
export async function getServerSideProps({ res }) {
  const { supabase } = await import('../lib/supabaseClient');
  const { propsSoloPrivada } = await import('../lib/obras');
  return propsSoloPrivada(supabase, res);
}
