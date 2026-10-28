import { useEffect, useState } from 'react';
import Link from 'next/link';
import { textoVuelta } from '../lib/obras';

// Aviso de "De vacaciones" en Servicios y Clases (lib/obras.js): una franja
// fija arriba y, la primera vez que se entra en la visita, una ventana con el
// mensaje. La página se sigue viendo debajo, pero no se puede reservar.
export default function AvisoVacaciones({ vacaciones }) {
  const [abierto, setAbierto] = useState(false);
  const vuelta = textoVuelta(vacaciones.vuelta);

  useEffect(() => {
    try {
      if (sessionStorage.getItem('aviso-vacaciones-visto')) return;
      sessionStorage.setItem('aviso-vacaciones-visto', '1');
    } catch (e) {}
    setAbierto(true);
  }, []);

  useEffect(() => {
    if (!abierto) return;
    const conTecla = (e) => e.key === 'Escape' && setAbierto(false);
    window.addEventListener('keydown', conTecla);
    return () => window.removeEventListener('keydown', conTecla);
  }, [abierto]);

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="block w-full bg-volt px-4 py-2 text-center text-xs font-bold uppercase tracking-widest text-ink"
      >
        🌴 Estamos de vacaciones{vuelta ? ` hasta el ${vuelta}` : ''}: reservas en pausa · la tienda sigue abierta
      </button>

      {abierto && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-5 backdrop-blur-sm"
          onClick={() => setAbierto(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-vacaciones"
        >
          <div
            className="relative w-full max-w-lg rounded-sm border border-volt/40 bg-ink p-8 text-center shadow-[0_0_60px_rgba(204,255,0,0.15)]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setAbierto(false)}
              aria-label="Cerrar aviso"
              className="absolute right-4 top-3 text-xl text-muted hover:text-paper"
            >
              ✕
            </button>
            <p className="text-4xl" aria-hidden="true">🎧🌴</p>
            <p className="mt-4 font-body text-xs uppercase tracking-[0.3em] text-volt">Modo avión activado</p>
            <h2 id="titulo-vacaciones" className="mt-3 font-display text-4xl leading-[0.95] tracking-wide text-paper md:text-5xl">
              EL ESTUDIO SE HA
              <br />
              <span className="text-volt">IDO DE VACACIONES.</span>
            </h2>
            <p className="mt-5 font-body text-sm leading-relaxed text-muted">{vacaciones.mensaje}</p>
            <p className="mt-3 font-body text-sm font-semibold text-paper">
              {vuelta ? `Volvemos el ${vuelta} con los oídos frescos.` : 'Volvemos muy pronto con los oídos frescos.'}
            </p>
            <p className="mt-1 font-body text-xs text-muted">Los monitores están apagados, pero las ideas no.</p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link
                href="/tienda"
                className="rounded-sm bg-volt px-5 py-3 text-xs font-semibold uppercase tracking-widest text-ink transition hover:brightness-110 hover:shadow-[0_0_28px_rgba(204,255,0,0.55)]"
              >
                Ir a la tienda
              </Link>
              <button
                type="button"
                onClick={() => setAbierto(false)}
                className="rounded-sm border border-white/20 px-5 py-3 text-xs font-semibold uppercase tracking-widest text-paper transition hover:border-paper"
              >
                Ver igualmente
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
