import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function CookieBanner() {
  const [mostrar, setMostrar] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent_accepted');
    if (!consent) {
      setMostrar(true);
    }
  }, []);

  const handleAceptar = () => {
    localStorage.setItem('cookie_consent_accepted', 'true');
    setMostrar(false);
  };

  if (!mostrar) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-ink/95 px-6 py-4 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-center md:flex-row md:text-left">
        <p className="text-xs text-muted leading-relaxed">
          Este sitio web utiliza cookies de terceros para optimizar tu navegación, adaptarse a tus preferencias y realizar labores analíticas. Al continuar navegando aceptas nuestra Política de cookies.
        </p>

        <div className="flex shrink-0 items-center gap-3">
          {/* Botón Aceptar: Fondo Volt sólido con letras negras */}
          <button
            onClick={handleAceptar}
            className="rounded bg-volt px-5 py-2 text-xs font-bold uppercase tracking-wider text-ink transition hover:bg-signal"
          >
            Aceptar
          </button>

          {/* Botón Leer Más: Borde Volt con letras Volt sobre fondo transparente */}
          <Link
            href="/politica-de-cookies"
            className="rounded border border-volt px-5 py-2 text-xs font-bold uppercase tracking-wider text-volt transition hover:bg-volt/10"
          >
            Leer Más
          </Link>
        </div>
      </div>
    </div>
  );
}
