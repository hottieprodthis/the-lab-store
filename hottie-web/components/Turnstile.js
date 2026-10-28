import { useEffect, useRef } from 'react';

// Casilla anti-bots de Cloudflare Turnstile (lib/turnstile.js). Normalmente
// no se ve nada: solo aparece si Cloudflare tiene dudas. Si no hay clave
// pública configurada en Vercel, no pinta nada.
const CLAVE = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

let cargando = null;
function cargarScript() {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (!cargando) {
    cargando = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = SCRIPT;
      s.async = true;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  return cargando;
}

export const turnstileVisible = Boolean(CLAVE);

export default function Turnstile({ onToken }) {
  const caja = useRef(null);
  const aviso = useRef(onToken);
  aviso.current = onToken;

  useEffect(() => {
    if (!CLAVE) return;
    let id = null;
    let vivo = true;
    cargarScript()
      .then(() => {
        if (!vivo || !caja.current || !window.turnstile) return;
        id = window.turnstile.render(caja.current, {
          sitekey: CLAVE,
          theme: 'dark',
          appearance: 'interaction-only',
          callback: (t) => aviso.current?.(t),
          'expired-callback': () => aviso.current?.(''),
          'error-callback': () => aviso.current?.(''),
        });
      })
      .catch(() => {});
    return () => {
      vivo = false;
      if (id !== null && window.turnstile) window.turnstile.remove(id);
    };
  }, []);

  if (!CLAVE) return null;
  return <div ref={caja} className="mt-1" />;
}
