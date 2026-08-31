import Head from 'next/head';
import { Bebas_Neue, Inter } from 'next/font/google';
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
  return (
    <CartProvider>
      <Head>
        <title>The Lab – Hottie</title>
        <link key="favicon-shortcut" rel="shortcut icon" href="/icon.svg?v=3" />
        <link key="favicon-svg" rel="icon" type="image/svg+xml" href="/icon.svg?v=3" />
        <link key="apple-icon" rel="apple-touch-icon" href="/icon.svg?v=3" />
      </Head>
      <main className={`${display.variable} ${body.variable} font-body bg-ink min-h-screen bg-grain`}>
        <Component {...pageProps} />
        <CartFloating />
      </main>
    </CartProvider>
  );
}import Head from 'next/head';
import { Bebas_Neue, Inter } from 'next/font/google';
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
  return (
    <CartProvider>
      <Head>
        <title>The Lab – Hottie</title>
        <link key="favicon" rel="icon" type="image/svg+xml" href="/icon.svg?v=3" />
        <link key="apple-icon" rel="apple-touch-icon" href="/icon.svg?v=3" />
      </Head>
      <main className={`${display.variable} ${body.variable} font-body bg-ink min-h-screen bg-grain`}>
        <Component {...pageProps} />
        <CartFloating />
      </main>
    </CartProvider>
  );
}
