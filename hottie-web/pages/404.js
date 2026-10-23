import Head from 'next/head';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

// Página para direcciones que no existen (antes salía la de Next.js, en inglés).
const BOTONES = [
  { href: '/tienda', texto: 'Tienda' },
  { href: '/servicios', texto: 'Servicios' },
  { href: '/clases', texto: 'Clases' },
];

export default function NoEncontrada() {
  return (
    <>
      <Head>
        <title>Página no encontrada — The Lab</title>
        <meta name="robots" content="noindex" />
      </Head>

      <Navbar />

      <main className="mx-auto max-w-xl px-5 py-24 text-center text-paper">
        <p className="font-display text-7xl text-volt">404</p>
        <h1 className="mt-4 font-display text-3xl uppercase tracking-wide">Esta página no existe</h1>
        <p className="mt-4 text-muted">
          Puede que el enlace esté mal escrito o que lo que buscabas ya no esté publicado. Prueba por aquí:
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {BOTONES.map((b) => (
            <Link
              key={b.href}
              href={b.href}
              className="rounded-sm border border-volt px-6 py-3 text-xs font-semibold uppercase tracking-widest text-volt transition hover:bg-volt hover:text-ink"
            >
              {b.texto}
            </Link>
          ))}
        </div>
        <Link href="/" className="mt-8 inline-block text-sm text-muted underline hover:text-paper">
          Volver a la portada
        </Link>
      </main>

      <Footer />
    </>
  );
}
