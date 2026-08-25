import { Bebas_Neue, Inter } from 'next/font/google';
import '../styles/globals.css';
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
    <main className={`${display.variable} ${body.variable} font-body bg-ink min-h-screen bg-grain`}>
      <Component {...pageProps} />
      <CartFloating />
    </main>
  );
}
