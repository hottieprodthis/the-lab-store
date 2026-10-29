import { useEffect, useRef, useState } from 'react';
import { interpretarDemo } from '../lib/demo';

// Reproductor "antes y después" de los servicios: la misma canción sin mezclar
// y mezclada. Las dos suenan a la vez y sincronizadas, pero solo se oye una:
// el botón ANTES | DESPUÉS cambia cuál se oye sin cortar ni volver al
// principio. Necesita enlaces de audio directos (MP3 de Dropbox o similar,
// ver lib/demo.js); si alguno no lo es, no se muestra.

export function enlacesAntesDespues(item) {
  const antes = interpretarDemo(item?.antes_url);
  const despues = interpretarDemo(item?.despues_url);
  if (antes?.tipo !== 'audio' || despues?.tipo !== 'audio') return null;
  return { antes: antes.src, despues: despues.src };
}

function formatoTiempo(seg) {
  if (!Number.isFinite(seg) || seg < 0) return '0:00';
  return `${Math.floor(seg / 60)}:${String(Math.floor(seg % 60)).padStart(2, '0')}`;
}

export default function AntesDespues({ antes, despues, compacto = false }) {
  const refAntes = useRef(null);
  const refDespues = useRef(null);
  const [cual, setCual] = useState('despues');
  const [sonando, setSonando] = useState(false);
  const [actual, setActual] = useState(0);
  const [duracion, setDuracion] = useState(0);
  const [error, setError] = useState(false);

  const oido = () => (cual === 'antes' ? refAntes.current : refDespues.current);
  const otro = () => (cual === 'antes' ? refDespues.current : refAntes.current);

  // Solo se oye la versión elegida; la otra sigue sonando en silencio.
  useEffect(() => {
    if (refAntes.current) refAntes.current.muted = cual !== 'antes';
    if (refDespues.current) refDespues.current.muted = cual !== 'despues';
  }, [cual]);

  // Si se sale de la página o se cierra el reproductor, se para.
  useEffect(() => () => [refAntes.current, refDespues.current].forEach((a) => a?.pause()), []);

  const cambiar = (nuevo) => {
    if (nuevo === cual) return;
    const desde = oido();
    const hacia = nuevo === 'antes' ? refAntes.current : refDespues.current;
    if (desde && hacia) hacia.currentTime = desde.currentTime;
    setCual(nuevo);
  };

  const alternar = async () => {
    const a = refAntes.current;
    const d = refDespues.current;
    if (!a || !d) return;
    if (sonando) {
      a.pause();
      d.pause();
      setSonando(false);
      return;
    }
    d.currentTime = a.currentTime = oido().currentTime;
    try {
      await Promise.all([a.play(), d.play()]);
      setSonando(true);
    } catch {
      setError(true);
    }
  };

  const saltar = (e) => {
    const caja = e.currentTarget.getBoundingClientRect();
    const t = Math.min(Math.max((e.clientX - caja.left) / caja.width, 0), 1) * (duracion || 0);
    [refAntes.current, refDespues.current].forEach((a) => a && (a.currentTime = t));
    setActual(t);
  };

  const alAvanzar = () => {
    const o = oido();
    const x = otro();
    if (!o) return;
    setActual(o.currentTime);
    if (o.duration && o.duration !== duracion) setDuracion(o.duration);
    // Si se desincronizan un poco, se vuelven a juntar.
    if (x && Math.abs(x.currentTime - o.currentTime) > 0.15) x.currentTime = o.currentTime;
  };

  const alAcabar = () => {
    [refAntes.current, refDespues.current].forEach((a) => {
      if (a) {
        a.pause();
        a.currentTime = 0;
      }
    });
    setSonando(false);
    setActual(0);
  };

  const pct = duracion ? (actual / duracion) * 100 : 0;

  return (
    <div className={`rounded-sm border border-white/10 bg-ink/60 ${compacto ? 'p-4' : 'p-5 sm:p-6'}`}>
      <audio
        ref={refAntes}
        src={antes}
        preload="metadata"
        onTimeUpdate={cual === 'antes' ? alAvanzar : undefined}
        onEnded={alAcabar}
        onError={() => setError(true)}
      />
      <audio
        ref={refDespues}
        src={despues}
        preload="metadata"
        onTimeUpdate={cual === 'despues' ? alAvanzar : undefined}
        onLoadedMetadata={(e) => setDuracion(e.currentTarget.duration)}
        onEnded={alAcabar}
        onError={() => setError(true)}
      />

      {!compacto && (
        <p className="mb-4 font-body text-xs uppercase tracking-[0.3em] text-volt">Escucha la diferencia</p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={alternar}
          aria-label={sonando ? 'Pausar' : 'Reproducir'}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-volt text-ink transition hover:brightness-110"
        >
          {sonando ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" /><rect x="14" y="5" width="4" height="14" /></svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
          )}
        </button>

        {/* Interruptor ANTES | DESPUÉS */}
        <div className="flex rounded-full border border-white/15 p-1 text-xs font-bold uppercase tracking-widest" role="group" aria-label="Versión">
          {[
            ['antes', 'Antes'],
            ['despues', 'Después'],
          ].map(([valor, texto]) => (
            <button
              key={valor}
              type="button"
              onClick={() => cambiar(valor)}
              aria-pressed={cual === valor}
              className={`rounded-full px-4 py-2 transition ${
                cual === valor ? (valor === 'despues' ? 'bg-volt text-ink' : 'bg-paper text-ink') : 'text-muted hover:text-paper'
              }`}
            >
              {texto}
            </button>
          ))}
        </div>

        <span className="ml-auto font-body text-xs tabular-nums text-muted">
          {formatoTiempo(actual)} / {formatoTiempo(duracion)}
        </span>
      </div>

      <div
        onClick={saltar}
        role="slider"
        aria-label="Posición de la canción"
        aria-valuemin={0}
        aria-valuemax={Math.round(duracion)}
        aria-valuenow={Math.round(actual)}
        className="mt-4 h-2 cursor-pointer rounded-full bg-white/10"
      >
        <div
          className={`h-full rounded-full transition-[width] duration-150 ${cual === 'despues' ? 'bg-volt' : 'bg-paper'}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="mt-3 font-body text-xs text-muted">
        {error
          ? 'No se ha podido cargar el audio. Inténtalo de nuevo más tarde.'
          : cual === 'antes'
            ? 'Estás escuchando la canción tal como llegó, sin mezclar.'
            : 'Estás escuchando la canción mezclada y masterizada en The Lab.'}
      </p>
    </div>
  );
}
