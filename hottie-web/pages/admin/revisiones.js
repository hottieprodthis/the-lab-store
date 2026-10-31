import { useEffect, useState } from 'react';
import Head from 'next/head';
import AdminGuard from '../../components/AdminGuard';
import AdminHeader from '../../components/AdminHeader';
import { supabaseAdmin as supabase } from '../../lib/supabaseAdminClient';

// Panel: revisiones de temas que mandan los suscriptores (1 al mes cada uno,
// con cupo total). Escribes tus puntos (uno por línea) y al enviar le llegan
// por correo y se quedan en su área de clientes.

async function llamarApi(metodo, datos) {
  const { data } = await supabase.auth.getSession();
  const cabeceras = { 'Content-Type': 'application/json', Authorization: `Bearer ${data?.session?.access_token || ''}` };
  const url = metodo === 'GET' ? `/api/admin/area?${new URLSearchParams(datos)}` : '/api/admin/area';
  const r = await fetch(url, { method: metodo, headers: cabeceras, ...(metodo === 'GET' ? {} : { body: JSON.stringify(datos) }) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`);
  return d;
}

// Este mes y los 5 anteriores (hora de España).
function ultimosMeses() {
  const meses = [];
  const ahora = new Date();
  for (let i = 0; i < 6; i += 1) {
    const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 15);
    meses.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return meses;
}

function Tarjeta({ r, onResponder }) {
  const [texto, setTexto] = useState(r.respuesta || '');
  const [editando, setEditando] = useState(r.estado !== 'respondida');
  const [msg, setMsg] = useState('');
  const [enviando, setEnviando] = useState(false);

  const enviar = async () => {
    setEnviando(true);
    setMsg('');
    try {
      const d = await onResponder(r.id, texto);
      setMsg(d.avisado ? '¡Enviada! Le ha llegado por correo.' : 'Guardada, pero el correo no se pudo enviar (la verá en su área).');
      setEditando(false);
    } catch (e) {
      setMsg(`Error: ${e.message}`);
    }
    setEnviando(false);
  };

  return (
    <div className="rounded-sm border border-white/10 bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-display text-lg tracking-wide text-paper">
            {r.titulo} — {r.artista}
          </p>
          <p className="text-xs text-muted">
            {r.email} · {new Date(r.created_at).toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${
            r.estado === 'respondida' ? 'bg-signal/15 text-signal' : 'bg-volt/15 text-volt'
          }`}
        >
          {r.estado === 'respondida' ? 'Respondida' : 'Pendiente'}
        </span>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
        {[
          ['Género', r.genero],
          ['BPM', r.bpm],
          ['Tonalidad', r.tonalidad],
          ['Calidad', r.calidad],
        ].map(([k, v]) => (
          <div key={k}>
            <dt className="text-[10px] uppercase tracking-widest text-muted">{k}</dt>
            <dd className="text-paper">{v || '—'}</dd>
          </div>
        ))}
      </dl>
      {r.nota && <p className="mt-3 whitespace-pre-line rounded-sm bg-white/5 p-3 text-sm text-paper">{r.nota}</p>}

      <div className="mt-4 rounded-sm border border-white/10 p-3">
        {r.enlaceSeguro ? (
          <>
            <p className="text-xs text-signal">✓ Enlace de {r.plataforma}, comprobado</p>
            <p className="mt-1 break-all text-xs text-muted">{r.enlaceSeguro}</p>
            <a
              href={r.enlaceSeguro}
              target="_blank"
              rel="noopener noreferrer nofollow"
              referrerPolicy="no-referrer"
              className="mt-2 inline-block rounded-sm border border-signal px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-signal hover:bg-signal hover:text-ink"
            >
              Abrir enlace ↗
            </a>
          </>
        ) : (
          <p className="text-xs text-red-400">⚠️ Este enlace ya no pasa la comprobación de seguridad: no lo abras.</p>
        )}
      </div>

      <div className="mt-4">
        {editando ? (
          <>
            <label className="mb-1 block text-xs uppercase tracking-widest text-muted">Tus puntos (uno por línea)</label>
            <textarea
              rows={5}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder={'Comercialmente tiene gancho: el estribillo se queda.\nLa voz está algo enterrada en el estribillo: súbela 1-2 dB.\nEl bajo y el bombo chocan en 60 Hz: deja hueco a uno de los dos.\nExporta el master con -1 dB de techo para las plataformas.'}
              className="w-full rounded-sm border border-white/20 bg-surface2 px-3 py-2 text-sm text-paper focus:border-volt focus:outline-none"
            />
            <button
              type="button"
              disabled={enviando || !texto.trim()}
              onClick={enviar}
              className="mt-3 rounded-sm bg-volt px-4 py-2 text-xs font-semibold uppercase tracking-widest text-ink hover:brightness-110 disabled:opacity-50"
            >
              {enviando ? 'Enviando…' : r.estado === 'respondida' ? 'Reenviar revisión' : 'Enviar revisión'}
            </button>
          </>
        ) : (
          <>
            <p className="whitespace-pre-line text-sm text-paper">{texto}</p>
            <button type="button" onClick={() => setEditando(true)} className="mt-2 text-xs text-muted underline hover:text-paper">
              Editar y reenviar
            </button>
          </>
        )}
        {msg && <p className={`mt-2 text-xs ${msg.startsWith('Error') ? 'text-red-400' : 'text-volt'}`}>{msg}</p>}
      </div>
    </div>
  );
}

export default function AdminRevisiones() {
  const meses = ultimosMeses();
  const [mes, setMes] = useState(meses[0]);
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');

  const cargar = async (m) => {
    setError('');
    try {
      setDatos(await llamarApi('GET', { seccion: 'revisiones', mes: m }));
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => {
    cargar(mes);
  }, [mes]);

  const responder = async (id, respuesta) => {
    const d = await llamarApi('POST', { accion: 'responderRevision', id, respuesta });
    cargar(mes);
    return d;
  };

  const pendientes = (datos?.revisiones || []).filter((r) => r.estado !== 'respondida').length;

  return (
    <AdminGuard>
      <Head>
        <title>Revisiones de temas — Panel</title>
      </Head>
      <AdminHeader title="Revisiones de temas" />
      <div className="mx-auto max-w-5xl px-5 py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <select value={mes} onChange={(e) => setMes(e.target.value)} className="rounded-sm border border-white/20 bg-surface2 px-3 py-2 text-paper">
            {meses.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          {datos && (
            <p className="text-sm text-muted">
              {datos.nombreMes}: <strong className="text-paper">{datos.revisiones.length}</strong> de {datos.cupo} · pendientes{' '}
              <strong className="text-volt">{pendientes}</strong>
            </p>
          )}
        </div>

        <div className="mb-8 rounded-sm border border-signal/30 bg-signal/5 p-4 text-xs leading-relaxed text-muted">
          <p className="mb-1 font-semibold uppercase tracking-widest text-signal">Para abrir enlaces con seguridad</p>
          Solo se aceptan enlaces https de plataformas conocidas (Drive, Dropbox, WeTransfer, SoundCloud…), así que no te pueden mandar a páginas falsas. Aun así:
          escucha el tema en la propia plataforma cuando se pueda; si descargas, abre solo audio (.wav, .mp3, .aiff, .flac) y nunca un .exe, .bat, .scr, .js, .apk ni un
          documento que te pida «habilitar macros»; y nunca metas tu contraseña en una página a la que hayas llegado desde un enlace de un cliente.
        </div>

        {error && <p className="text-sm text-red-400">Error: {error}</p>}
        {datos && datos.revisiones.length === 0 && <p className="text-sm text-muted">No hay revisiones este mes.</p>}
        <div className="space-y-5">
          {(datos?.revisiones || []).map((r) => (
            <Tarjeta key={r.id} r={r} onResponder={responder} />
          ))}
        </div>
      </div>
    </AdminGuard>
  );
}
