import { useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

// Si usas CartContext, intenta importarlo (descomenta si aplica en tu estructura)
// import { useCart } from '../context/CartContext';

export default function Gracias() {
  const router = useRouter();
  const { tipo } = router.query;

  // Intenta limpiar carrito vía Context si está disponible
  // const { clearCart } = useCart?.() || {};

  useEffect(() => {
    // 1. Limpia todo el almacenamiento del carrito en el navegador
    localStorage.removeItem('cart');
    localStorage.removeItem('cart_data');
    localStorage.removeItem('carrito');

    // 2. Ejecuta clearCart si existe en tu contexto
    // if (clearCart) clearCart();

    // 3. Avisa a otros componentes (Navbar/Header) para que actualicen el contador a 0
    window.dispatchEvent(new Event('storage'));
  }, []);

  const esServicio = tipo === 'servicio';
  const esMixto = tipo === 'mixto';

  return (
    <>
      <Head>
        <title>¡Gracias por tu compra! — The Lab</title>
      </Head>

      <Navbar />

      <main className="mx-auto max-w-3xl px-5 py-20 text-center">
        <div className="bg-surface p-10 border border-white/10 rounded-sm">
          <div className="mx-auto w-16 h-16 bg-volt/10 text-volt rounded-full flex items-center justify-center text-3xl mb-6">
            ✓
          </div>

          <h1 className="font-display text-4xl md:text-5xl text-paper tracking-wide">
            ¡MUCHAS GRACIAS POR TU COMPRA!
          </h1>

          <p className="mt-4 text-muted text-lg max-w-lg mx-auto">
            {esServicio && (
              'Hemos recibido los datos de tu proyecto correctamente. En breve nos pondremos en contacto contigo por correo o WhatsApp para comenzar.'
            )}
            {esMixto && (
              'Tu pedido ha sido procesado con éxito. Revisa tu correo electrónico para acceder a los enlaces de descarga y en breve nos pondremos en contacto contigo para coordinar el servicio.'
            )}
            {!esServicio && !esMixto && (
              'Tu pedido ha sido procesado con éxito. Revisa tu correo electrónico para acceder a los archivos y enlaces de descarga.'
            )}
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/tienda"
              className="w-full sm:w-auto bg-volt text-ink font-bold px-8 py-3 text-sm uppercase tracking-wider transition hover:brightness-110"
            >
              Volver a la Tienda
            </Link>

            <Link
              href="/contacto"
              className="w-full sm:w-auto border border-white/20 text-paper font-semibold px-8 py-3 text-sm uppercase tracking-wider transition hover:border-white"
            >
              Contacto
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
