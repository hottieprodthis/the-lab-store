import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

// Opiniones aprobadas de clientes (lib/opiniones.js) para la portada: nota
// media con estrellas y un carrusel. Si todavía no hay ninguna aprobada, no
// se muestra nada.
function Estrellas({ n, className = '' }) {
  return (
    <span className={className} aria-label={`${n} de 5 estrellas`}>
      <span className="text-volt">{'★'.repeat(n)}</span>
      <span className="text-white/15">{'★'.repeat(5 - n)}</span>
    </span>
  );
}

export default function Opiniones({ ejemplo }) {
  const [lista, setLista] = useState(ejemplo || []);
  const pista = useRef(null);

  useEffect(() => {
    if (ejemplo) return; // vista previa con datos de ejemplo
    supabase
      .from('opiniones')
      .select('id, nombre, texto, estrellas, articulo, created_at')
      .eq('aprobada', true)
      .order('created_at', { ascending: false })
      .limit(30)
      .then(({ data }) => setLista(data || []));
  }, []);

  if (lista.length === 0) return null;

  const media = lista.reduce((s, o) => s + o.estrellas, 0) / lista.length;
  const mover = (dir) => {
    const el = pista.current;
    if (el) el.scrollBy({ left: dir * Math.min(el.clientWidth * 0.9, 380), behavior: 'smooth' });
  };

  return (
    <section className="mx-auto max-w-6xl border-t border-white/10 px-5 py-16">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-body text-xs uppercase tracking-[0.3em] text-volt">En sus palabras</p>
          <h2 className="mt-2 font-display text-4xl tracking-wide text-paper">LO QUE DICEN LOS ARTISTAS</h2>
          <p className="mt-2 flex items-center gap-3 font-body text-sm text-muted">
            <Estrellas n={Math.round(media)} className="text-lg" />
            <span>
              <strong className="text-paper">{media.toFixed(1).replace('.', ',')}</strong>/5 · {lista.length}{' '}
              {lista.length === 1 ? 'opinión' : 'opiniones'} de clientes
            </span>
          </p>
        </div>
        {lista.length > 1 && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => mover(-1)}
              aria-label="Opiniones anteriores"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-paper transition hover:border-volt hover:text-volt"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => mover(1)}
              aria-label="Más opiniones"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-paper transition hover:border-volt hover:text-volt"
            >
              →
            </button>
          </div>
        )}
      </div>

      <div ref={pista} className="-mx-5 flex snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto px-5 pb-4 [scrollbar-width:none]">
        {lista.map((o) => (
          <figure
            key={o.id}
            className="flex w-[85%] shrink-0 snap-start flex-col justify-between rounded-sm border border-white/10 bg-surface p-6 sm:w-[360px]"
          >
            <div>
              <Estrellas n={o.estrellas} className="text-base" />
              <blockquote className="mt-4 whitespace-pre-line font-body text-sm leading-relaxed text-paper/90">“{o.texto}”</blockquote>
            </div>
            <figcaption className="mt-6 border-t border-white/10 pt-4">
              <p className="font-display text-xl tracking-wide text-paper">{o.nombre}</p>
              {o.articulo && <p className="text-xs text-muted">{o.articulo}</p>}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
