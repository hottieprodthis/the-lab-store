import Head from 'next/head';

// Título, descripción y vista previa al compartir (WhatsApp, Instagram, X…)
// de una página pública, más su dirección oficial (canonical) para que Google
// no cuente la misma página dos veces (con y sin www, con parámetros…).
//
//   <Seo title="Tienda — The Lab" description="…" path="/tienda" image={urlFoto} />
//
// Sin "image" se usa /og-image.png (logo de The Lab).
const SITIO = 'https://www.hottieprodthis.com';

function absoluta(url) {
  if (!url) return `${SITIO}/og-image.png`;
  return url.startsWith('http') ? url : `${SITIO}${url.startsWith('/') ? '' : '/'}${url}`;
}

export default function Seo({ title, description, path = '/', image, type = 'website' }) {
  const url = `${SITIO}${path === '/' ? '/' : path}`;
  const desc = String(description || '').replace(/\s+/g, ' ').trim().slice(0, 160);
  const img = absoluta(image);
  return (
    <Head>
      <title>{title}</title>
      {desc && <meta name="description" content={desc} />}
      <link rel="canonical" href={url} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content="The Lab by Hottie" />
      <meta property="og:locale" content="es_ES" />
      <meta property="og:title" content={title} />
      {desc && <meta property="og:description" content={desc} />}
      <meta property="og:url" content={url} />
      <meta property="og:image" content={img} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      {desc && <meta name="twitter:description" content={desc} />}
      <meta name="twitter:image" content={img} />
    </Head>
  );
}
