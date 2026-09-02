import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="es">
      <Head>
        <meta name="theme-color" content="#0A0A0D" />
        <link rel="icon" type="image/png" href="/favicon.png" />
        <link rel="icon" type="image/svg+xml" href="/icon.svg" />
        <link rel="apple-touch-icon" href="/favicon.png" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
