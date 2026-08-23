import Head from 'next/head';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function Contacto() {
  return (
    <>
      <Head>
        <title>Contacto — The Lab</title>
      </Head>

      <Navbar />

      <section className="mx-auto max-w-2xl px-5 py-24 text-center">
        <h1 className="font-display text-5xl tracking-wide text-paper">Hablemos</h1>
        <p className="mt-4 text-muted">
          ¿Quieres reservar un servicio o tienes una pregunta? Escríbeme directamente.
        </p>
        <a
          href="mailto:contacto@tudominio.com"
          className="mt-8 inline-block rounded-sm bg-volt px-8 py-4 text-sm font-semibold uppercase tracking-widest text-ink transition hover:brightness-110"
        >
          contacto@tudominio.com
        </a>
        <p className="mt-3 text-xs text-muted">
          (Cambia este correo por el tuyo en <code>pages/contacto.js</code>, o pídeme que te lo edite)
        </p>
      </section>

      <Footer />
    </>
  );
}
