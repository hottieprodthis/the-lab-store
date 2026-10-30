import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

// Avisos de compras REALES (pages/api/compras-recientes.js): "Antonio compró
// Kit X · desde España · ✓ Verificado". Si el cliente no aceptó salir con su
// nombre, pone "Alguien". Nunca se inventan compras: sin ventas recientes no
// sale nada. Ordenador: abajo a la izquierda. Móvil: arriba, bajo el menú,
// para no tapar el carrito ni el botón de volver.
const PRIMERO_MS = 20000; // a los 20 s de entrar
const ENTRE_MS = 90000; // y luego cada minuto y medio
const VISIBLE_MS = 7000; // cada aviso se ve 7 s
const MAXIMO = 3; // como mucho 3 por visita
const CLAVE = 'thelab-avisos-compras';

function nombrePais(codigo) {
  if (!codigo) return '';
  try {
    return new Intl.DisplayNames(['es'], { type: 'region' }).of(codigo) || '';
  } catch {
    return '';
  }
}

export default function AvisoCompras({ ejemplo }) {
  const router = useRouter();
  const [actual, setActual] = useState(ejemplo || null);

  useEffect(() => {
    if (ejemplo || router.pathname.startsWith('/admin')) return;
    try {
      if (sessionStorage.getItem(CLAVE) === 'cerrado') return;
    } catch {}

    let compras = [];
    let mostrados = 0;
    let indice = 0;
    let ocultar;
    let intervalo;
    let cancelado = false;
    const mostrar = () => {
      if (cancelado || !compras.length || mostrados >= MAXIMO) return;
      setActual(compras[indice % compras.length]);
      indice += 1;
      mostrados += 1;
      ocultar = setTimeout(() => setActual(null), VISIBLE_MS);
    };
    const primero = setTimeout(async () => {
      try {
        const r = await fetch('/api/compras-recientes');
        // Barajadas en cada visita, para que no salgan siempre las mismas ni en el mismo orden.
        compras = ((await r.json()).compras || [])
          .map((c) => [Math.random(), c])
          .sort((a, b) => a[0] - b[0])
          .map(([, c]) => c);
      } catch {}
      mostrar();
      intervalo = setInterval(mostrar, ENTRE_MS);
    }, PRIMERO_MS);
    return () => {
      cancelado = true;
      clearTimeout(primero);
      clearTimeout(ocultar);
      clearInterval(intervalo);
    };
  }, [router.pathname, ejemplo]);

  const cerrar = () => {
    setActual(null);
    try {
      sessionStorage.setItem(CLAVE, 'cerrado');
    } catch {}
  };

  if (!actual) return null;
  const pais = nombrePais(actual.pais);

  return (
    <div
      role="status"
      className="fixed left-3 right-3 top-[76px] z-30 flex items-center gap-3 rounded-2xl bg-paper p-3 pr-4 text-ink shadow-[0_12px_40px_rgba(0,0,0,0.45)] animate-[aparecer_0.4s_ease-out] md:bottom-20 md:left-6 md:right-auto md:top-auto md:max-w-sm"
    >
      {actual.imagen ? (
        <img src={actual.imagen} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
      ) : (
        <span aria-hidden="true" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-ink text-2xl">
          🎧
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="font-body text-sm text-ink/70">
          <strong className="text-ink">{actual.nombre || 'Alguien'}</strong> compró
        </p>
        <p className="truncate font-body text-[15px] font-bold leading-tight text-ink">{actual.articulo}</p>
        <p className="mt-0.5 flex items-center gap-1.5 font-body text-xs text-ink/60">
          {pais && <span>desde {pais}</span>}
          {pais && <span aria-hidden="true">·</span>}
          <span className="inline-flex items-center gap-1 text-[#10B981]">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 2l2.4 2.1 3.2-.3.9 3.1 2.8 1.6-1.1 3 1.1 3-2.8 1.6-.9 3.1-3.2-.3L12 22l-2.4-2.1-3.2.3-.9-3.1-2.8-1.6 1.1-3-1.1-3 2.8-1.6.9-3.1 3.2.3z" />
              <path d="M8.5 12.5l2.3 2.3 4.7-4.7" />
            </svg>
            Verificado
          </span>
        </p>
      </div>
      <button type="button" onClick={cerrar} aria-label="No mostrar más" className="self-start text-sm text-ink/40 hover:text-ink">
        ✕
      </button>
    </div>
  );
}
