import { useEffect, useRef, useState } from 'react';

// Reproductor de demos con onda de sonido (para enlaces de audio directos,
// p. ej. MP3 de Dropbox; ver lib/demo.js). La onda se pinta en verde según
// avanza la canción y se puede pinchar para saltar a cualquier punto.
//
// La forma de la onda se calcula del propio audio cuando el servidor del
// archivo lo permite; si no (algunos sitios no dejan leerlo desde otra web),
// se dibuja una onda de adorno y el reproductor funciona igual.

const BARRAS = 72;

// Onda de adorno, siempre la misma para el mismo enlace.
function ondaDeAdorno(texto) {
  let semilla = 0;
  for (let i = 0; i < texto.length; i++) semilla = (semilla * 31 + texto.charCodeAt(i)) >>> 0;
  const azar = () => {
    semilla = (semilla * 1664525 + 1013904223) >>> 0;
    return semilla / 4294967296;
  };
  return Array.from({ length: BARRAS }, (_, i) => {
    const forma = 0.55 + 0.45 * Math.sin((i / BARRAS) * Math.PI);
    return Math.max(0.12, forma * (0.35 + azar() * 0.65));
  });
}

function formatoTiempo(seg) {
  if (!Number.isFinite(seg) || seg < 0) return '0:00';
  const m = Math.floor(seg / 60);
  const s = Math.floor(seg % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function OndaAudio({ src, portada }) {
  const audioRef = useRef(null);
  const [picos, setPicos] = useState(() => ondaDeAdorno(src));
  const [sonando, setSonando] = useState(false);
  const [actual, setActual] = useState(0);
  const [duracion, setDuracion] = useState(0);
  const [error, setError] = useState(false);

  // Intenta leer la forma real de la onda.
  useEffect(() => {
    let cancelado = false;
    setPicos(ondaDeAdorno(src));
    (async () => {
      try {
        const Contexto = window.AudioContext || window.webkitAudioContext;
        if (!Contexto) return;
        const resp = await fetch(src);
        if (!resp.ok) return;
        const datos = await resp.arrayBuffer();
        const ctx = new Contexto();
        const buffer = await ctx.decodeAudioData(datos);
        ctx.close?.();
        const canal = buffer.getChannelData(0);
        const tramo = Math.floor(canal.length / BARRAS);
        const valores = [];
        for (let b = 0; b < BARRAS; b++) {
          let max = 0;
          const inicio = b * tramo;
          // Basta con muestrear: no hace falta mirar cada valor.
          for (let j = 0; j < tramo; j += 64) {
            const v = Math.abs(canal[inicio + j] || 0);
            if (v > max) max = v;
          }
          valores.push(max);
        }
        const mayor = Math.max(...valores) || 1;
        if (!cancelado) setPicos(valores.map((v) => Math.max(0.08, v / mayor)));
      } catch (e) {
        // Se queda la onda de adorno.
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [src]);

  // Si el audio ya había cargado su duración antes de que la página estuviera
  // lista, el aviso "loadedmetadata" se pierde: se lee directamente.
  useEffect(() => {
    const a = audioRef.current;
    if (a && a.readyState >= 1 && Number.isFinite(a.duration)) setDuracion(a.duration);
  }, [src]);

  const alternar = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => setError(true));
    else a.pause();
  };

  const saltar = (e) => {
    const a = audioRef.current;
    if (!a || !duracion) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX ?? e.touches?.[0]?.clientX ?? r.left) - r.left;
    a.currentTime = Math.min(Math.max(x / r.width, 0), 1) * duracion;
    if (a.paused) a.play().catch(() => setError(true));
  };

  const progreso = duracion ? actual / duracion : 0;

  // Cuántas barras caben (una cada ~5 px), para que en el móvil no queden
  // tan finas que no se vean.
  const ondaRef = useRef(null);
  const [cuantas, setCuantas] = useState(BARRAS);
  useEffect(() => {
    const el = ondaRef.current;
    if (!el) return;
    const medir = () => setCuantas(Math.max(20, Math.min(BARRAS, Math.floor(el.clientWidth / 5))));
    medir();
    if (!('ResizeObserver' in window)) return;
    const obs = new ResizeObserver(medir);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  const barras = Array.from({ length: cuantas }, (_, i) => {
    const desde = Math.floor((i * picos.length) / cuantas);
    const hasta = Math.max(desde + 1, Math.floor(((i + 1) * picos.length) / cuantas));
    return Math.max(...picos.slice(desde, hasta));
  });

  return (
    <div className="flex items-center gap-4">
      {portada && <img src={portada} alt="" className="hidden h-16 w-16 shrink-0 rounded-sm object-cover sm:block" />}

      <button
        type="button"
        onClick={alternar}
        aria-label={sonando ? 'Pausar la demo' : 'Escuchar la demo'}
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-volt text-ink transition hover:scale-105 hover:shadow-[0_0_24px_rgba(204,255,0,0.55)]"
      >
        {sonando ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="ml-0.5">
            <path d="M7 5.5v13a1 1 0 0 0 1.5.86l11-6.5a1 1 0 0 0 0-1.72l-11-6.5A1 1 0 0 0 7 5.5z" />
          </svg>
        )}
      </button>

      <div className="min-w-0 flex-1">
        <div
          ref={ondaRef}
          role="slider"
          tabIndex={0}
          aria-label="Posición de la demo"
          aria-valuemin={0}
          aria-valuemax={Math.round(duracion)}
          aria-valuenow={Math.round(actual)}
          onClick={saltar}
          onKeyDown={(e) => {
            const a = audioRef.current;
            if (!a) return;
            if (e.key === 'ArrowRight') a.currentTime = Math.min(a.currentTime + 5, duracion || 0);
            if (e.key === 'ArrowLeft') a.currentTime = Math.max(a.currentTime - 5, 0);
            if (e.key === ' ' || e.key === 'Enter') {
              e.preventDefault();
              alternar();
            }
          }}
          className="flex h-14 cursor-pointer items-center gap-[2px]"
        >
          {barras.map((p, i) => {
            const hecho = (i + 0.5) / barras.length <= progreso;
            return (
              <span
                key={i}
                className={`block min-w-[2px] flex-1 rounded-full transition-colors duration-150 ${hecho ? 'bg-volt' : 'bg-white/20'}`}
                style={{ height: `${Math.round(p * 100)}%`, minHeight: 3 }}
              />
            );
          })}
        </div>
        <div className="mt-1 flex justify-between font-mono text-[11px] text-muted">
          <span>{formatoTiempo(actual)}</span>
          <span>{error ? 'No se ha podido reproducir' : formatoTiempo(duracion)}</span>
        </div>
      </div>

      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => setSonando(true)}
        onPause={() => setSonando(false)}
        onEnded={() => setSonando(false)}
        onTimeUpdate={(e) => {
          const a = e.currentTarget;
          setActual(a.currentTime);
          if (Number.isFinite(a.duration) && a.duration > 0) setDuracion(a.duration);
        }}
        onLoadedMetadata={(e) => setDuracion(e.currentTarget.duration)}
        onDurationChange={(e) => setDuracion(e.currentTarget.duration)}
        onError={() => setError(true)}
        className="hidden"
      />
    </div>
  );
}
