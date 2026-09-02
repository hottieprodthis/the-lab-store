import Head from 'next/head';
import { Bebas_Neue, Inter } from 'next/font/google';
import { useEffect } from 'react';
import '../styles/globals.css';
import { CartProvider } from '../context/CartContext';
import CartFloating from '../components/CartFloating';

const display = Bebas_Neue({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-display',
  display: 'swap',
});

const body = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

export default function App({ Component, pageProps }) {
  useEffect(() => {
    // Desactiva la restauración automática del scroll del navegador
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    // Fuerza que la página vuelva arriba del todo al cargar o refrescar
    window.scrollTo(0, 0);
  }, []);

  return (
    <CartProvider>
      <Head>
        <title>The Lab – Hottie</title>
        <meta name="google-site-verification" content="Uw-H1BijekkxCzXY17ahyEABFKkhdHYhGaK9ujlPaVo" />
      </Head>
      <main className={`${display.variable} ${body.variable} font-body bg-ink min-h-screen bg-grain`}>
        <Component {...pageProps} />
        <CartFloating />
      </main>
    </CartProvider>
  );
}
