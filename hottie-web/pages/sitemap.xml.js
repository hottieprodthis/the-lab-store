import { createClient } from '@supabase/supabase-js';

// Mapa de la web para Google (https://www.hottieprodthis.com/sitemap.xml).
// Se genera en cada visita con las páginas fijas y TODOS los productos,
// servicios y clases publicados, así siempre está al día sin tocar nada.
// (Antes era un archivo fijo con solo la portada y el FAQ.)
const SITIO = 'https://www.hottieprodthis.com';

const FIJAS = [
  { path: '/', prioridad: '1.0', frecuencia: 'weekly' },
  { path: '/tienda', prioridad: '0.9', frecuencia: 'weekly' },
  { path: '/servicios', prioridad: '0.9', frecuencia: 'weekly' },
  { path: '/clases', prioridad: '0.9', frecuencia: 'weekly' },
  { path: '/faq', prioridad: '0.6', frecuencia: 'monthly' },
  { path: '/contacto', prioridad: '0.6', frecuencia: 'monthly' },
  { path: '/condiciones-de-venta', prioridad: '0.3', frecuencia: 'yearly' },
  { path: '/politica-de-privacidad', prioridad: '0.3', frecuencia: 'yearly' },
  { path: '/politica-de-cookies', prioridad: '0.3', frecuencia: 'yearly' },
];

const SECCIONES = [
  { tabla: 'products', ruta: '/tienda' },
  { tabla: 'services', ruta: '/servicios' },
  { tabla: 'classes', ruta: '/clases' },
];

function escapar(texto) {
  return String(texto).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function getServerSideProps({ res }) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');
  const urls = FIJAS.map((p) => ({ loc: `${SITIO}${p.path}`, prioridad: p.prioridad, frecuencia: p.frecuencia }));

  for (const s of SECCIONES) {
    const { data } = await supabase.from(s.tabla).select('*').eq('active', true);
    for (const fila of data || []) {
      if (!fila.slug) continue;
      urls.push({
        loc: `${SITIO}${s.ruta}/${encodeURIComponent(fila.slug)}`,
        prioridad: '0.8',
        frecuencia: 'weekly',
        ...(fila.created_at ? { lastmod: new Date(fila.created_at).toISOString().slice(0, 10) } : {}),
      });
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${escapar(u.loc)}</loc>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ''}
    <changefreq>${u.frecuencia}</changefreq>
    <priority>${u.prioridad}</priority>
  </url>`
  )
  .join('\n')}
</urlset>
`;

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.write(xml);
  res.end();
  return { props: {} };
}

export default function Sitemap() {
  return null;
}
