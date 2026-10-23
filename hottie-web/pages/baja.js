import { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

// Página del enlace "Darme de baja" de los correos de novedades. Pide
// confirmar con un botón (la baja la hace pages/api/baja.js).
export default function Baja() {
  const router = useRouter();
  const { email, t } = router.query;
  const [estado, setEstado] = useState('inicio'); // inicio | enviando | hecho | error
  const [mensaje, setMensaje] = useState('');

  async function confirmar() {
    setEstado('enviando');
    try {
      const res = await fetch('/api/baja', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, t }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setEstado('hecho');
      } else {
        setEstado('error');
        setMensaje(data.error || 'No se pudo completar la baja.');
      }
    } catch (e) {
      setEstado('error');
      setMensaje('Error de conexión. Inténtalo de nuevo.');
    }
  }

  return (
    <>
      <Head>
        <title>Darme de baja | The Lab – Hottie</title>
        <meta name="robots" content="noindex" />
      </Head>

      <Navbar />

      <main className="mx-auto max-w-xl px-5 py-24 text-center text-paper">
        <h1 className="font-display text-3xl uppercase tracking-wide text-volt mb-6">Darme de baja</h1>

        {!router.isReady ? null : !email || !t ? (
          <p className="text-muted">El enlace no es válido. Ábrelo desde el último correo que te enviamos.</p>
        ) : estado === 'hecho' ? (
          <p className="text-muted">
            Listo: <strong className="text-paper">{email}</strong> ya no recibirá avisos de novedades. Si tienes cuenta, puedes volver a
            activarlos cuando quieras desde los ajustes de tu área de clientes.
          </p>
        ) : (
          <>
            <p className="text-muted mb-8">
              ¿Quieres dejar de recibir los avisos de novedades (productos, servicios, clases y cambios de precio) en{' '}
              <strong className="text-paper">{email}</strong>? Los correos de tus compras te seguirán llegando.
            </p>
            <button
              onClick={confirmar}
              disabled={estado === 'enviando'}
              className="rounded-sm bg-volt px-8 py-3 text-sm font-semibold uppercase tracking-widest text-ink hover:brightness-110 disabled:opacity-50"
            >
              {estado === 'enviando' ? 'Un momento…' : 'Sí, darme de baja'}
            </button>
            {estado === 'error' && <p className="mt-6 text-sm text-red-400">{mensaje}</p>}
          </>
        )}
      </main>

      <Footer />
    </>
  );
}
