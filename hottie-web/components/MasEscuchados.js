import { useEffect, useRef, useState } from 'react';

// "Los más escuchados" de la portada: carrusel de vídeos de YouTube que solo
// se cargan al pulsarlos (hasta entonces es la miniatura), para que la portada
// no vaya más lenta ni cargue cosas de YouTube a quien no los ve. Solo hay un
// vídeo abierto a la vez: al abrir otro, al pasar con las flechas o cuando el
// vídeo termina, vuelve a salir su portada con el botón de play.
const TRABAJOS = [
  { id: '3Zv90KozeWQ', titulo: 'Ellos Dicen', artista: 'El Jincho', rol: 'Producción, mezcla y master' },
  { id: 'CSwVFEqkh7M', titulo: 'El Ascensor #2', artista: 'Kristina', rol: 'Producción, mezcla y master' },
  { id: 'VCBXWR6gJBQ', titulo: 'Ritnes', artista: 'Ritnes', rol: 'Producción' },
  { id: 'i5zNnE5zQPg', titulo: 'Kaneli (Dale Comba Remix)', artista: 'Hottie', rol: 'Producción, mezcla y master' },
  { id: '_Pmuy6lSvnE', titulo: 'Mi Estrella Blanca (Remix)', artista: 'Hottie', rol: 'Producción, mezcla y master' },
  { id: '4opG1jH_r8E', titulo: 'Virtual Diva (Remix)', artista: 'Hottie', rol: 'Producción, mezcla y master' },
  { id: 'O_9VBKTnJi8', titulo: 'Latigazo (Látigo Remix)', artista: 'Hottie', rol: 'Producción, mezcla y master' },
  { id: 'JuV_x0fpadk', titulo: 'Rueda Rueda (Remix)', artista: 'Hottie', rol: 'Producción, mezcla y master' },
];

function Video({ trabajo, abierto, abrir, cerrar }) {
  const marco = useRef(null);

  // Avisa cuando el vídeo termina (mensajes del reproductor de YouTube con
  // enablejsapi=1; estado 0 = terminado) para volver a la portada.
  useEffect(() => {
    if (!abierto) return;
    const alMensaje = (e) => {
      if (e.source !== marco.current?.contentWindow) return;
      if (!/^https:\/\/www\.youtube(-nocookie)?\.com$/.test(e.origin)) return;
      let datos;
      try {
        datos = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
      } catch {
        return;
      }
      if (datos?.event === 'onStateChange' && datos.info === 0) cerrar();
      if (datos?.event === 'infoDelivery' && datos.info?.playerState === 0) cerrar();
    };
    window.addEventListener('message', alMensaje);
    return () => window.removeEventListener('message', alMensaje);
  }, [abierto, cerrar]);

  // Pide al reproductor que mande esos avisos.
  const alCargar = () => {
    marco.current?.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: trabajo.id }), '*');
  };

  return (
    <figure className="group w-[85%] shrink-0 snap-start sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)]">
      <div className="relative aspect-video overflow-hidden rounded-lg border border-white/10 bg-black/40 shadow-xl">
        {abierto ? (
          <iframe
            ref={marco}
            onLoad={alCargar}
            className="h-full w-full"
            src={`https://www.youtube-nocookie.com/embed/${trabajo.id}?autoplay=1&enablejsapi=1&rel=0`}
            title={`${trabajo.titulo} – ${trabajo.artista}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            onClick={abrir}
            aria-label={`Ver ${trabajo.titulo} de ${trabajo.artista}`}
            className="absolute inset-0 h-full w-full"
          >
            <img
              src={`https://i.ytimg.com/vi/${trabajo.id}/hqdefault.jpg`}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover opacity-80 transition duration-300 group-hover:scale-105 group-hover:opacity-100"
            />
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-volt text-ink shadow-[0_0_28px_rgba(204,255,0,0.45)] transition group-hover:scale-110">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
            </span>
          </button>
        )}
      </div>
      <figcaption className="mt-3">
        <p className="font-display text-xl tracking-wide text-paper">{trabajo.titulo}</p>
        <p className="text-xs text-muted">
          {trabajo.artista} · <span className="text-volt">{trabajo.rol}</span>
        </p>
      </figcaption>
    </figure>
  );
}

// Última tarjeta del carrusel: deja claro que hay muchos más trabajos y
// lleva a los créditos completos en Muso.ai.
function YMuchosMas() {
  return (
    <a
      href="https://muso.ai/profile/6f3664ee-3a33-4b81-aeda-d228ac88b0e7"
      target="_blank"
      rel="noopener noreferrer"
      className="group w-[85%] shrink-0 snap-start sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)]"
    >
      <div className="relative flex aspect-video flex-col items-center justify-center overflow-hidden rounded-lg border border-dashed border-white/20 bg-surface px-6 text-center transition duration-300 group-hover:border-volt group-hover:shadow-[0_0_28px_rgba(204,255,0,0.25)]">
        <div className="waveform mb-4" aria-hidden="true">
          {Array.from({ length: 7 }).map((_, i) => (
            <span key={i} />
          ))}
        </div>
        <p className="font-display text-3xl tracking-wide text-paper md:text-4xl">Y MUCHOS MÁS…</p>
        <p className="mt-2 font-body text-xs text-muted">+100 producciones y +20M de visualizaciones</p>
      </div>
      <div className="mt-3">
        <p className="font-display text-xl tracking-wide text-paper transition group-hover:text-volt">Ver todos los créditos ↗</p>
        <p className="text-xs text-muted">En Muso.ai</p>
      </div>
    </a>
  );
}

export default function MasEscuchados() {
  const pista = useRef(null);
  const [abierto, setAbierto] = useState(null); // id del vídeo que suena
  const cerrar = useRef(() => setAbierto(null)).current;
  const mover = (dir) => {
    setAbierto(null);
    const el = pista.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: 'smooth' });
  };
  const flecha =
    'flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-paper transition hover:border-volt hover:text-volt';

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-body text-xs uppercase tracking-[0.3em] text-volt">Trabajos</p>
          <h2 className="mt-2 font-display text-4xl tracking-wide text-paper">LOS MÁS ESCUCHADOS</h2>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => mover(-1)} aria-label="Trabajos anteriores" className={flecha}>
            ←
          </button>
          <button type="button" onClick={() => mover(1)} aria-label="Más trabajos" className={flecha}>
            →
          </button>
        </div>
      </div>
      <div ref={pista} className="-mx-5 mt-8 flex snap-x snap-mandatory gap-6 overflow-x-auto px-5 pb-4 [scrollbar-width:none]">
        {TRABAJOS.map((t) => (
          <Video key={t.id} trabajo={t} abierto={abierto === t.id} abrir={() => setAbierto(t.id)} cerrar={cerrar} />
        ))}
        <YMuchosMas />
      </div>
    </div>
  );
}
