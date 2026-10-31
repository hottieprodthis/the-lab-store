import { useState } from 'react';
import { comprobarEnlace, NOMBRES_PLATAFORMAS } from '../lib/enlacesSeguros';
import { CALIDADES, MENSAJE_CUPO_LLENO } from '../lib/revisiones';
import { TIPOS_DESCUENTO } from '../lib/descuentoSuscriptor';

// Bloques "extra" del área de clientes (pages/area-cliente.js). Los datos
// salen de pages/api/area/extras.js.

const euros = (cents) => `${(cents / 100).toFixed(2).replace('.', ',')} €`;

function Etiqueta({ children }) {
  return <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-volt">{children}</p>;
}

// --- Insignias (cabecera) ---
export function Insignias({ insignias }) {
  if (!insignias) return null;
  const chips = [];
  if (insignias.porVida) chips.push({ ...insignias.porVida, destacada: true });
  if (insignias.antiguedad) chips.push(insignias.antiguedad);
  if (insignias.compras?.nombre) chips.push(insignias.compras);
  const siguiente = insignias.compras?.falta || insignias.antiguedad?.falta;
  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        {chips.map((c) => (
          <span
            key={c.nombre}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wider ${
              c.destacada ? 'border-volt bg-volt/10 text-volt' : 'border-white/15 text-paper'
            }`}
          >
            <span aria-hidden="true">{c.emoji}</span>
            {c.nombre}
          </span>
        ))}
      </div>
      {siguiente && <p className="mt-2 text-[11px] text-muted">Te faltan {siguiente}</p>}
    </div>
  );
}

// --- Próximamente (solo si el admin ha escrito algo) ---
export function Proximamente({ texto }) {
  if (!texto) return null;
  return (
    <section className="rounded-sm border border-signal/40 bg-signal/5 p-6">
      <Etiqueta>Próximamente</Etiqueta>
      <p className="whitespace-pre-line text-sm leading-relaxed text-paper">{texto}</p>
    </section>
  );
}

// --- Cierre anunciado del área ---
export function AvisoCierre({ cierre }) {
  if (!cierre) return null;
  const fecha = new Date(cierre.cierre).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Madrid' });
  return (
    <section className="rounded-sm border border-red-500/40 bg-red-500/5 p-6">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-red-400">Aviso importante</p>
      <p className="text-sm leading-relaxed text-paper">
        El área de clientes cerrará el <strong>{fecha}</strong>. Hasta entonces tienes acceso a todo: descarga los kits y packs que quieras conservar.
      </p>
    </section>
  );
}

// --- Planes: mensual y de por vida ---
export function Planes({ textoMensual, porVida, onElegir }) {
  const plazo = porVida ? Math.ceil(porVida.cents / 3) : 0;
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <div className="flex flex-col rounded-sm border border-white/15 bg-surface p-6">
        <Etiqueta>Mensual</Etiqueta>
        <p className="font-display text-3xl tracking-wide text-paper">{textoMensual}</p>
        <p className="mt-2 flex-1 text-sm text-muted">Acceso a todo mientras estés suscrito. Cancelas cuando quieras desde aquí mismo.</p>
        <button
          type="button"
          onClick={() => onElegir('mensual')}
          className="mt-6 rounded-sm border border-volt px-6 py-3 text-xs font-semibold uppercase tracking-widest text-volt transition hover:bg-volt hover:text-ink"
        >
          Suscribirme
        </button>
      </div>
      {porVida && (
        <div className="relative flex flex-col rounded-sm border-2 border-volt bg-surface p-6 shadow-[0_0_40px_rgba(204,255,0,0.12)]">
          <span className="absolute -top-3 right-5 rounded-full bg-volt px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-ink">
            Mejor valor
          </span>
          <Etiqueta>De por vida</Etiqueta>
          <p className="font-display text-3xl tracking-wide text-paper">
            {porVida.oferta && (
              <span className="mr-2 text-lg text-muted line-through decoration-1">{euros(porVida.oferta.precio_original_cents)}</span>
            )}
            {euros(porVida.cents)}
          </p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-volt">Pago único · o en 3 plazos de {euros(plazo)}</p>
          <p className="mt-2 flex-1 text-sm text-muted">
            Pagas una vez y tienes para siempre todo lo exclusivo, también lo que subamos más adelante. Sin cuotas ni renovaciones.
          </p>
          <button
            type="button"
            onClick={() => onElegir('por_vida')}
            className="mt-6 rounded-sm bg-volt px-6 py-3 text-xs font-bold uppercase tracking-widest text-ink transition hover:brightness-110"
          >
            Hacerme de por vida
          </button>
        </div>
      )}
    </div>
  );
}

// --- Escaparate para quien aún no está suscrito ---
export function Escaparate({ escaparate, revision, descuento, textoMensual, porVida, onElegir }) {
  const packs = escaparate?.packs || [];
  const posts = escaparate?.posts || [];
  const huecos = packs.length > 0 ? packs : [{ title: 'Muy pronto' }, { title: 'Muy pronto' }, { title: 'Muy pronto' }];
  const quedan = revision ? Math.max(0, revision.cupo - revision.usadas) : null;
  const tiposDescuento = descuento
    ? TIPOS_DESCUENTO.filter((t) => descuento.tipos.includes(t.valor)).map((t) => t.texto.toLowerCase())
    : [];

  const ventajas = [
    'Kits y packs exclusivos para descargar',
    'Posts y novedades que no salen en ningún otro sitio',
    'Revisión de tu tema cada mes: Hottie te dice qué le falta en calidad y sonido',
    'Votaciones para decidir qué kits y contenido sacamos después',
  ];
  if (descuento) ventajas.push(`−${descuento.porcentaje} % en ${tiposDescuento.join(', ')}`);

  return (
    <section className="space-y-10">
      <div className="text-center">
        <Etiqueta>Área exclusiva</Etiqueta>
        <h2 className="font-display text-3xl tracking-wide text-paper md:text-4xl">Esto es lo que te estás perdiendo</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted">
          {escaparate?.totalPacks || escaparate?.totalPosts
            ? `${escaparate.totalPacks} ${escaparate.totalPacks === 1 ? 'kit/pack' : 'kits y packs'} y ${escaparate.totalPosts} ${escaparate.totalPosts === 1 ? 'post' : 'posts'} exclusivos ya publicados, y cada mes subimos más.`
            : 'Kits, packs y posts exclusivos que vamos subiendo cada mes.'}
        </p>
      </div>

      {/* Kits y packs, con la portada difuminada */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {huecos.slice(0, 6).map((p, i) => (
          <div key={i} className="group relative overflow-hidden rounded-sm border border-white/10 bg-surface">
            <div className="relative aspect-square overflow-hidden">
              {p.cover_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.cover_url} alt="" className="h-full w-full scale-110 object-cover blur-md brightness-75" />
              ) : (
                <div className="h-full w-full bg-[radial-gradient(circle_at_30%_30%,rgba(204,255,0,0.25),transparent_60%),radial-gradient(circle_at_70%_70%,rgba(16,185,129,0.25),transparent_55%)] blur-sm" />
              )}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink/80 text-xl" aria-hidden="true">
                  🔒
                </span>
              </div>
            </div>
            <p className="truncate px-3 py-2 text-xs font-semibold uppercase tracking-wider text-paper">{p.title}</p>
          </div>
        ))}
      </div>

      {/* Posts: título a la vista, texto tapado */}
      {posts.length > 0 && (
        <div className="space-y-3">
          {posts.map((p, i) => (
            <div key={i} className="rounded-sm border border-white/10 bg-surface p-5">
              <p className="font-display text-lg tracking-wide text-paper">🔒 {p.title}</p>
              <div className="mt-3 space-y-2 blur-[3px]" aria-hidden="true">
                <div className="h-2.5 w-11/12 rounded bg-white/15" />
                <div className="h-2.5 w-4/5 rounded bg-white/15" />
                <div className="h-2.5 w-2/3 rounded bg-white/15" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Qué incluye */}
      <div className="rounded-sm border border-white/10 bg-surface p-6">
        <Etiqueta>Qué incluye</Etiqueta>
        <ul className="grid gap-3 text-sm text-paper md:grid-cols-2">
          {ventajas.map((v) => (
            <li key={v} className="flex items-start gap-2">
              <span className="mt-0.5 text-volt" aria-hidden="true">✓</span>
              <span>{v}</span>
            </li>
          ))}
        </ul>
        {quedan !== null && revision.cupo > 0 && (
          <p className="mt-5 border-t border-white/10 pt-4 text-xs text-muted">
            🎧 Este mes {quedan === 1 ? 'queda' : 'quedan'} <strong className="text-volt">{quedan} de {revision.cupo}</strong> revisiones gratis para suscriptores.
          </p>
        )}
      </div>

      <Planes textoMensual={textoMensual} porVida={porVida} onElegir={onElegir} />
    </section>
  );
}

// --- Votación abierta ---
export function Votacion({ votacion, onVotar }) {
  const [enviando, setEnviando] = useState(false);
  const [cambiando, setCambiando] = useState(false);
  if (!votacion) return null;
  const total = (votacion.resultados || []).reduce((a, b) => a + b, 0);
  const verResultados = votacion.miVoto !== null && votacion.miVoto !== undefined && !cambiando;

  const votar = async (i) => {
    setEnviando(true);
    await onVotar(votacion.id, i);
    setCambiando(false);
    setEnviando(false);
  };

  return (
    <section className="rounded-sm border border-white/10 bg-surface p-6">
      <Etiqueta>Tú decides</Etiqueta>
      <h3 className="font-display text-xl tracking-wide text-paper">{votacion.pregunta}</h3>
      <div className="mt-5 space-y-3">
        {votacion.opciones.map((texto, i) =>
          verResultados ? (
            <div key={i} className="relative overflow-hidden rounded-sm border border-white/10 px-4 py-3">
              <div
                className={`absolute inset-y-0 left-0 ${i === votacion.miVoto ? 'bg-volt/20' : 'bg-white/5'}`}
                style={{ width: `${total ? Math.round((votacion.resultados[i] / total) * 100) : 0}%` }}
                aria-hidden="true"
              />
              <div className="relative flex items-center justify-between gap-3 text-sm">
                <span className={i === votacion.miVoto ? 'font-semibold text-volt' : 'text-paper'}>
                  {i === votacion.miVoto ? '✓ ' : ''}
                  {texto}
                </span>
                <span className="text-xs text-muted">{total ? Math.round((votacion.resultados[i] / total) * 100) : 0} %</span>
              </div>
            </div>
          ) : (
            <button
              key={i}
              type="button"
              disabled={enviando}
              onClick={() => votar(i)}
              className="block w-full rounded-sm border border-white/15 px-4 py-3 text-left text-sm text-paper transition hover:border-volt hover:text-volt disabled:opacity-50"
            >
              {texto}
            </button>
          )
        )}
      </div>
      {verResultados && (
        <p className="mt-4 text-xs text-muted">
          {total} {total === 1 ? 'voto' : 'votos'} ·{' '}
          <button type="button" onClick={() => setCambiando(true)} className="underline hover:text-paper">
            cambiar mi voto
          </button>
        </p>
      )}
    </section>
  );
}

// --- Revisión de tu tema ---
const CAMPOS_VACIOS = { enlace: '', titulo: '', artista: '', genero: '', bpm: '', tonalidad: '', calidad: '', nota: '' };

function Respuesta({ r }) {
  const puntos = String(r.respuesta || '')
    .split(/\r?\n/)
    .map((l) => l.replace(/^[-•*·\s]+/, '').trim())
    .filter(Boolean);
  return (
    <div className="rounded-sm border border-volt/30 bg-volt/5 p-4">
      <p className="text-xs uppercase tracking-widest text-volt">
        {r.titulo} — {r.artista}
      </p>
      <ul className="mt-3 space-y-2 text-sm text-paper">
        {puntos.map((p, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-volt" aria-hidden="true">•</span>
            <span>{p}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function RevisionTema({ revision, onEnviar }) {
  const [datos, setDatos] = useState(CAMPOS_VACIOS);
  const [error, setError] = useState('');
  const [lleno, setLleno] = useState(false);
  const [enviando, setEnviando] = useState(false);
  if (!revision) return null;

  const quedan = Math.max(0, revision.cupo - revision.usadas);
  const mia = revision.mia;
  const cambiar = (campo) => (e) => setDatos({ ...datos, [campo]: e.target.value });
  const enlaceRevisado = datos.enlace.trim() ? comprobarEnlace(datos.enlace) : null;

  const enviar = async (e) => {
    e.preventDefault();
    setError('');
    if (enlaceRevisado && !enlaceRevisado.ok) {
      setError(enlaceRevisado.motivo);
      return;
    }
    setEnviando(true);
    const r = await onEnviar(datos);
    setEnviando(false);
    if (r?.motivo === 'lleno') setLleno(true);
    else if (r?.error) setError(r.error);
  };

  const campo = 'w-full rounded-sm border border-white/20 bg-surface2 px-3 py-2 text-sm text-paper focus:border-volt focus:outline-none';
  const etiqueta = 'mb-1 block text-[11px] uppercase tracking-widest text-muted';

  let contenido;
  if (mia) {
    contenido =
      mia.estado === 'respondida' ? (
        <>
          <p className="mb-3 text-sm text-muted">Ya tienes la revisión de este mes. ¡Apunta estos puntos!</p>
          <Respuesta r={mia} />
        </>
      ) : (
        <p className="text-sm text-paper">
          ✅ Recibimos <strong>{mia.titulo}</strong> ({mia.plataforma}). Hottie lo escuchará y te llegará la revisión por correo y aquí mismo.
        </p>
      );
  } else if (lleno || (revision.cupo > 0 && quedan === 0) || revision.cupo === 0) {
    contenido = (
      <div className="rounded-sm border border-white/10 bg-white/5 p-5 text-center">
        <p className="font-display text-lg tracking-wide text-paper">{MENSAJE_CUPO_LLENO.titulo}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">{MENSAJE_CUPO_LLENO.texto}</p>
      </div>
    );
  } else {
    contenido = (
      <form onSubmit={enviar} className="space-y-4">
        <div>
          <label className={etiqueta} htmlFor="rev-enlace">Enlace a tu tema *</label>
          <input
            id="rev-enlace"
            type="url"
            required
            inputMode="url"
            placeholder="https://drive.google.com/..."
            value={datos.enlace}
            onChange={cambiar('enlace')}
            className={campo}
          />
          {enlaceRevisado?.ok && <p className="mt-1 text-[11px] text-signal">✓ Enlace de {enlaceRevisado.plataforma}</p>}
          {enlaceRevisado && !enlaceRevisado.ok && <p className="mt-1 text-[11px] text-red-400">{enlaceRevisado.motivo}</p>}
          {!enlaceRevisado && (
            <p className="mt-1 text-[11px] text-muted">
              Por seguridad solo aceptamos: {NOMBRES_PLATAFORMAS.slice(0, 8).join(', ')} y otras plataformas conocidas. Deja el enlace abierto para que se pueda escuchar.
            </p>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={etiqueta} htmlFor="rev-titulo">Título *</label>
            <input id="rev-titulo" required maxLength={120} value={datos.titulo} onChange={cambiar('titulo')} className={campo} />
          </div>
          <div>
            <label className={etiqueta} htmlFor="rev-artista">Artista *</label>
            <input id="rev-artista" required maxLength={120} value={datos.artista} onChange={cambiar('artista')} className={campo} />
          </div>
          <div>
            <label className={etiqueta} htmlFor="rev-genero">Género</label>
            <input id="rev-genero" maxLength={80} placeholder="Reggaeton, tech house..." value={datos.genero} onChange={cambiar('genero')} className={campo} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={etiqueta} htmlFor="rev-bpm">BPM</label>
              <input id="rev-bpm" inputMode="numeric" maxLength={10} value={datos.bpm} onChange={cambiar('bpm')} className={campo} />
            </div>
            <div>
              <label className={etiqueta} htmlFor="rev-tono">Tonalidad</label>
              <input id="rev-tono" maxLength={20} placeholder="La menor" value={datos.tonalidad} onChange={cambiar('tonalidad')} className={campo} />
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className={etiqueta} htmlFor="rev-calidad">Calidad del archivo *</label>
            <select id="rev-calidad" required value={datos.calidad} onChange={cambiar('calidad')} className={campo}>
              <option value="">Elige…</option>
              {CALIDADES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-muted">Lo ideal, como en nuestros servicios: WAV 24-bit / 48 kHz o MP3 a 320 kbps.</p>
          </div>
          <div className="sm:col-span-2">
            <label className={etiqueta} htmlFor="rev-nota">¿Algo que quieras que mire? (opcional)</label>
            <textarea id="rev-nota" rows={3} maxLength={400} value={datos.nota} onChange={cambiar('nota')} className={campo} />
          </div>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={enviando}
          className="rounded-sm bg-volt px-6 py-3 text-xs font-bold uppercase tracking-widest text-ink transition hover:brightness-110 disabled:opacity-50"
        >
          {enviando ? 'Enviando…' : 'Enviar mi tema'}
        </button>
      </form>
    );
  }

  return (
    <section className="rounded-sm border border-white/10 bg-surface p-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Etiqueta>Revisión de tu tema</Etiqueta>
          <h3 className="font-display text-xl tracking-wide text-paper">¿Cómo suena tu canción?</h3>
        </div>
        {revision.cupo > 0 && (
          <span className="rounded-full border border-volt/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-volt">
            {quedan} de {revision.cupo} libres este mes
          </span>
        )}
      </div>
      <p className="mb-5 text-sm leading-relaxed text-muted">
        Una vez al mes, mándanos tu tema y Hottie te dirá qué tal lo ve comercialmente y unos cuantos puntos de calidad y sonido para mejorarlo. Sin directos: te llega por escrito para que lo apuntes.
      </p>
      {contenido}
      {revision.anteriores?.length > 0 && (
        <div className="mt-6 space-y-3 border-t border-white/10 pt-5">
          <p className="text-[11px] uppercase tracking-widest text-muted">Tus revisiones anteriores</p>
          {revision.anteriores.map((r) => (
            <Respuesta key={r.id} r={r} />
          ))}
        </div>
      )}
    </section>
  );
}
