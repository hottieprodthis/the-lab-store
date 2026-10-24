import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="es">
      <Head>
        <meta name="theme-color" content="#0A0A0D" />
        {/* Pestaña del navegador: el icono redondo (los navegadores prefieren el SVG). */}
        <link rel="icon" type="image/svg+xml" href="/icon.svg" />
        {/* Para Google: cuadrado todo verde; Google lo recorta en redondo y así no sale aro blanco. */}
        <link rel="icon" type="image/png" sizes="192x192" href="/icono-google.png" />
        <link rel="apple-touch-icon" href="/favicon.png" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
