import Head from 'next/head';
import Link from 'next/link';
import Navbar from './Navbar';
import Footer from './Footer';

// Pantalla común de los errores (pages/500.js y pages/_error.js), con el
// mismo estilo que la de "página no encontrada" (pages/404.js).
export default function PaginaError({ codigo, titulo, texto }) {
  return (
    <>
      <Head>
        <title>{`${titulo} — The Lab`}</title>
        <meta name="robots" content="noindex" />
      </Head>

      <Navbar />

      <main className="mx-auto max-w-xl px-5 py-24 text-center text-paper">
        {codigo && <p className="font-display text-7xl text-volt">{codigo}</p>}
        <h1 className="mt-4 font-display text-3xl uppercase tracking-wide">{titulo}</h1>
        <p className="mt-4 text-muted">{texto}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-sm bg-volt px-6 py-3 text-xs font-semibold uppercase tracking-widest text-ink transition hover:brightness-110"
          >
            Volver a intentarlo
          </button>
          <Link
            href="/contacto"
            className="rounded-sm border border-white/20 px-6 py-3 text-xs font-semibold uppercase tracking-widest text-paper transition hover:border-paper"
          >
            Avisarnos
          </Link>
        </div>
        <Link href="/" className="mt-8 inline-block text-sm text-muted underline hover:text-paper">
          Volver a la portada
        </Link>
      </main>

      <Footer />
    </>
  );
}
