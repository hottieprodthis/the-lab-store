import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

// Botón flotante "Volver" (abajo a la izquierda) en todas las páginas menos la
// portada y la pantalla principal del panel. Lleva a la página anterior de la web, una a una, hasta
// donde empezó el visitante. Si entró directamente en esta página (desde
// Google, un correo o al volver de pagar), no hay página anterior de la web:
// entonces sube un nivel (de /servicios/mezcla a /servicios, y de ahí a la
// portada; en el panel, a la pantalla principal del panel) en vez de sacarle
// de la web.
const CLAVE = 'thelab-rastro';

export function hayBotonAtras(pathname) {
  return !['/', '/admin', '/admin/login'].includes(pathname);
}

function leer() {
  try {
    return JSON.parse(sessionStorage.getItem(CLAVE)) || [];
  } catch {
    return [];
  }
}

function guardar(rastro) {
  try {
    sessionStorage.setItem(CLAVE, JSON.stringify(rastro.slice(-50)));
  } catch {}
}

// Solo estas secciones tienen página propia a la que subir.
const SECCIONES = ['/servicios', '/clases', '/tienda'];
function nivelSuperior(ruta) {
  const limpia = ruta.split(/[?#]/)[0];
  if (limpia.startsWith('/admin')) return '/admin';
  const partes = limpia.split('/').filter(Boolean);
  partes.pop();
  const padre = '/' + partes.join('/');
  return SECCIONES.includes(padre) ? padre : '/';
}

export default function BotonAtras() {
  const router = useRouter();
  const [rastro, setRastro] = useState([]);

  // Apunta cada página que se visita. Si la nueva es la penúltima, es que se
  // ha vuelto atrás (con este botón o con el del navegador) y se quita la última.
  useEffect(() => {
    const apuntar = (url) => {
      const ruta = url.split('#')[0];
      const r = leer();
      if (r[r.length - 2] === ruta) r.pop();
      else if (r[r.length - 1] !== ruta) r.push(ruta);
      guardar(r);
      setRastro(r);
    };
    apuntar(router.asPath);
    router.events.on('routeChangeComplete', apuntar);
    return () => router.events.off('routeChangeComplete', apuntar);
  }, []);

  if (!hayBotonAtras(router.pathname)) return null;

  const volver = () => {
    if (rastro.length > 1) router.back();
    else router.push(nivelSuperior(router.asPath));
  };

  return (
    <button
      type="button"
      onClick={volver}
      aria-label="Volver a la página anterior"
      className="fixed bottom-6 left-6 z-30 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-ink/80 text-paper backdrop-blur transition hover:border-volt hover:text-volt"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M19 12H5M12 19l-7-7 7-7" />
      </svg>
    </button>
  );
}
