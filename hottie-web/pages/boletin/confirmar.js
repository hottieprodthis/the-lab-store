import { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';

// Página del botón "Confirmar" del correo de alta en el boletín. Pide pulsar
// un botón (así un programa que abra los enlaces del correo por su cuenta no
// confirma por la persona). La confirmación la hace pages/api/boletin.js.
export default function ConfirmarBoletin() {
  const router = useRouter();
  const { email, t } = router.query;
  const [estado, setEstado] = useState('inicio'); // inicio | enviando | hecho | error
  const [mensaje, setMensaje] = useState('');

  async function confirmar() {
    setEstado('enviando');
    try {
      const res = await fetch('/api/boletin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'confirmar', email, t }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setEstado('hecho');
      } else {
        setEstado('error');
        setMensaje(data.error || 'No se pudo confirmar.');
      }
    } catch (e) {
      setEstado('error');
      setMensaje('Error de conexión. Inténtalo de nuevo.');
    }
  }

  return (
    <>
      <Head>
        <title>Confirmar suscripción | The Lab – Hottie</title>
        <meta name="robots" content="noindex" />
      </Head>

      <Navbar />

      <main className="mx-auto max-w-xl px-5 py-24 text-center text-paper">
        <h1 className="font-display text-3xl uppercase tracking-wide text-volt mb-6">Novedades de The Lab</h1>

        {!router.isReady ? null : !email || !t ? (
          <p className="text-muted">El enlace no es válido. Ábrelo desde el correo que te enviamos.</p>
        ) : estado === 'hecho' ? (
          <p className="text-muted">
            ¡Listo! <strong className="text-paper">{email}</strong> ya recibirá los avisos de nuevos productos, servicios, clases y
            cambios de precio. Puedes darte de baja cuando quieras desde el enlace que irá al final de cada correo.
          </p>
        ) : (
          <>
            <p className="text-muted mb-8">
              Confirma que quieres recibir las novedades de The Lab en <strong className="text-paper">{email}</strong>.
            </p>
            <button
              onClick={confirmar}
              disabled={estado === 'enviando'}
              className="rounded-sm bg-volt px-8 py-3 text-sm font-semibold uppercase tracking-widest text-ink hover:brightness-110 disabled:opacity-50"
            >
              {estado === 'enviando' ? 'Un momento…' : 'Confirmar'}
            </button>
            {estado === 'error' && <p className="mt-6 text-sm text-red-400">{mensaje}</p>}
          </>
        )}
      </main>

      <Footer />
    </>
  );
}
