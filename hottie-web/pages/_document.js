import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="es">
      <Head>
        <meta name="theme-color" content="#0A0A0D" />
        {/* Pestaña del navegador: SIEMPRE el icono redondo. */}
        <link rel="icon" type="image/png" href="/favicon.png" />
        <link rel="icon" type="image/svg+xml" href="/icon.svg" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
