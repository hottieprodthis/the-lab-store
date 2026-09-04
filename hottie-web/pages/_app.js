import Head from 'next/head';
import { Bebas_Neue, Inter } from 'next/font/google';
import { useEffect } from 'react';
import { GoogleAnalytics } from '@next/third-parties/google';
import Script from 'next/script';
import '../styles/globals.css';
import { CartProvider } from '../context/CartContext';
import CartFloating from '../components/CartFloating';
import CookieBanner from '../components/CookieBanner';

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

const GA_MEASUREMENT_ID = 'G-BL30X192XS';

export default function App({ Component, pageProps }) {
  useEffect(() => {
    // Desactiva la restauración automática del scroll del navegador
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    // Fuerza que la página vuelva arriba del todo al cargar o refrescar
    window.scrollTo(0, 0);

    // Si el usuario ya aceptó las cookies anteriormente, concedemos permisos
    const consent = localStorage.getItem('cookie_consent_accepted');
    if (consent === 'true' && window.gtag) {
      window.gtag('consent', 'update', {
        analytics_storage: 'granted',
        ad_storage: 'granted',
      });
    }
  }, []);

  return (
    <CartProvider>
      <Head>
        <title>The Lab – Hottie</title>
        <meta name="google-site-verification" content="Uw-H1BijekkxCzXY17ahyEABFKkhdHYhGaK9ujlPaVo" />
      </Head>

      {/* Bloqueo inicial de cookies según el Consent Mode v2 de Google */}
      <Script
        id="google-consent-default"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('consent', 'default', {
              'analytics_storage': 'denied',
              'ad_storage': 'denied'
            });
          `,
        }}
      />

      <main className={`${display.variable} ${body.variable} font-body bg-ink min-h-screen bg-grain`}>
        <Component {...pageProps} />
        <CartFloating />
        <CookieBanner />
      </main>

      {/* Script oficial de Google Analytics */}
      <GoogleAnalytics gaId={GA_MEASUREMENT_ID} />
    </CartProvider>
  );
}
