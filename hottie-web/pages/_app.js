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
        <title>The Lab - Hottie</title>
        <link key="favicon" rel="icon" type="image/png" href="/favicon.png?v=5" />
        <link key="apple-icon" rel="apple-touch-icon" href="/favicon.png?v=5" />
      </Head>
      <main className={`${display.variable} ${body.variable} font-body bg-ink min-h-screen bg-grain`}>
        <Component {...pageProps} />
        <CartFloating />
      </main>
    </CartProvider>
  );
}
