import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import AdminGuard from '../../components/AdminGuard';
import AdminHeader from '../../components/AdminHeader';
import { supabaseAdmin as supabase } from '../../lib/supabaseAdminClient';
import { aInputFecha, leerOfertaSuscripcion, precioOfertaValido } from '../../lib/ofertas';
import { PRECIO_POR_VIDA_DEFECTO_CENTS, DIAS_AVISO_CIERRE, leerCierreArea } from '../../lib/suscripcion';
import { TIPOS_DESCUENTO } from '../../lib/descuentoSuscriptor';
import { CUPO_REVISIONES_DEFECTO_PANEL } from '../../lib/revisiones';

// Panel: extras del área de clientes.
//   - Suscripción de por vida (precio y oferta con precio anterior tachado).
//   - Descuento para suscriptores (%, en qué y hasta cuándo).
//   - Bloque "Próximamente" (solo sale si hay texto).
//   - Votaciones para los suscriptores.
//   - Cupo de revisiones de temas al mes.
//   - Aviso de cierre del área de clientes (60 días, condiciones de venta).
// Los ajustes van a la tabla settings; votaciones y revisiones, por
// pages/api/admin/area.js.

const caja = 'mb-10 rounded-sm border border-white/10 bg-surface p-6';
const titulo = 'font-display text-xl tracking-wide text-paper mb-1';
const ayuda = 'mb-4 text-sm text-muted';
const campo = 'rounded-sm border border-white/20 bg-surface2 px-3 py-2 text-paper focus:outline-none focus:border-volt';
const etiqueta = 'mb-1 block text-xs uppercase tracking-widest text-muted';
const botonLleno = 'rounded-sm bg-volt px-4 py-2 text-xs font-semibold uppercase tracking-widest text-ink hover:brightness-110';
const botonBorde = 'rounded-sm border border-volt px-4 py-2 text-xs font-semibold uppercase tracking-widest text-volt hover:bg-volt hover:text-ink';

async function guardarAjuste(key, value) {
  const { error } = await supabase.from('settings').upsert({ key, value }, { onConflict: 'key' });
  return error ? `Error: ${error.message}` : null;
}

async function llamarApi(metodo, cuerpoOQuery) {
  const { data } = await supabase.auth.getSession();
  const cabeceras = { 'Content-Type': 'application/json', Authorization: `Bearer ${data?.session?.access_token || ''}` };
  const url = metodo === 'GET' ? `/api/admin/area?${new URLSearchParams(cuerpoOQuery)}` : '/api/admin/area';
  const r = await fetch(url, { method: metodo, headers: cabeceras, ...(metodo === 'GET' ? {} : { body: JSON.stringify(cuerpoOQuery) }) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`);
  return d;
}

function Mensaje({ texto }) {
  if (!texto) return null;
  return <p className={`mt-3 text-xs ${texto.startsWith('Error') ? 'text-red-400' : 'text-volt'}`}>{texto}</p>;
}

export default function AdminAreaPrivada() {
  const [cargando, setCargando] = useState(true);

  // De por vida
  const [precioVida, setPrecioVida] = useState((PRECIO_POR_VIDA_DEFECTO_CENTS / 100).toFixed(2));
  const [ofertaVida, setOfertaVida] = useState({ activa: false, tipo: 'precio', valor: '', inicio: '', fin: '' });
  const [msgVida, setMsgVida] = useState('');

  // Descuento suscriptores
  const [desc, setDesc] = useState({ porcentaje: '', tipos: [], hasta: '' });
  const [msgDesc, setMsgDesc] = useState('');

  // Próximamente
  const [proximamente, setProximamente] = useState('');
  const [msgProx, setMsgProx] = useState('');

  // Votaciones
  const [votaciones, setVotaciones] = useState([]);
  const [nueva, setNueva] = useState({ pregunta: '', opciones: '' });
  const [msgVot, setMsgVot] = useState('');

  // Revisiones
  const [cupo, setCupo] = useState(String(CUPO_REVISIONES_DEFECTO_PANEL));
  const [msgCupo, setMsgCupo] = useState('');

  // Cierre del área de clientes
  const [cierre, setCierre] = useState(null);
  const [fechaCierre, setFechaCierre] = useState('');
  const [msgCierre, setMsgCierre] = useState('');

  async function cargar() {
    const { data } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['lifetime_price', 'lifetime_offer', 'subscriber_discount', 'coming_soon', 'review_quota', 'area_closing']);
    const valor = (k) => (data || []).find((x) => x.key === k)?.value;

    if (valor('lifetime_price')) setPrecioVida(String(valor('lifetime_price')));
    const of = leerOfertaSuscripcion(valor('lifetime_offer'));
    setOfertaVida(
      of
        ? { activa: true, tipo: of.oferta_tipo, valor: String(of.oferta_valor ?? ''), inicio: aInputFecha(of.oferta_inicio), fin: aInputFecha(of.oferta_fin) }
        : { activa: false, tipo: 'precio', valor: '', inicio: '', fin: '' }
    );

    let d = null;
    try {
      d = valor('subscriber_discount') ? JSON.parse(valor('subscriber_discount')) : null;
    } catch (e) {
      d = null;
    }
    setDesc({ porcentaje: d?.porcentaje ? String(d.porcentaje) : '', tipos: Array.isArray(d?.tipos) ? d.tipos : [], hasta: aInputFecha(d?.hasta) });
    setProximamente(valor('coming_soon') || '');
    if (valor('review_quota') !== undefined && valor('review_quota') !== null) setCupo(String(valor('review_quota')));
    setCierre(leerCierreArea(valor('area_closing')));
    setFechaCierre(aInputFecha(new Date(Date.now() + (DIAS_AVISO_CIERRE + 1) * 86400000).toISOString()));

    try {
      setVotaciones((await llamarApi('GET', { seccion: 'votaciones' })).votaciones || []);
    } catch (e) {
      setMsgVot(`Error: ${e.message}`);
    }
    setCargando(false);
  }

  useEffect(() => {
    cargar();
  }, []);

  // --- De por vida ---
  async function guardarVida(e) {
    e.preventDefault();
    setMsgVida('');
    const normal = parseFloat(String(precioVida).replace(',', '.'));
    if (!(normal >= 0.5)) {
      setMsgVida('Error: el precio tiene que ser de al menos 0,50 €.');
      return;
    }
    let valorOferta = '';
    if (ofertaVida.activa) {
      const inicio = ofertaVida.inicio ? new Date(ofertaVida.inicio) : new Date();
      const fin = ofertaVida.fin ? new Date(ofertaVida.fin) : null;
      const v = parseFloat(String(ofertaVida.valor).replace(',', '.'));
      if (!fin || Number.isNaN(fin.getTime()) || fin <= inicio) {
        setMsgVida('Error: elige una fecha de fin posterior a la de inicio.');
        return;
      }
      if (ofertaVida.tipo === 'porcentaje' ? !(v >= 1 && v <= 99) : !(precioOfertaValido(v, normal) && v >= 0.5)) {
        setMsgVida(
          ofertaVida.tipo === 'porcentaje'
            ? 'Error: el descuento tiene que estar entre 1 % y 99 %.'
            : 'Error: el precio de oferta tiene que ser menor que el normal y de al menos 0,50 €.'
        );
        return;
      }
      valorOferta = JSON.stringify({ oferta_tipo: ofertaVida.tipo, oferta_valor: v, oferta_inicio: inicio.toISOString(), oferta_fin: fin.toISOString() });
    }
    const error = (await guardarAjuste('lifetime_price', normal.toFixed(2))) || (await guardarAjuste('lifetime_offer', valorOferta));
    setMsgVida(error || (ofertaVida.activa ? '¡Guardado! El precio normal saldrá tachado mientras dure la oferta.' : '¡Precio guardado!'));
  }

  // --- Descuento suscriptores ---
  async function guardarDescuento(e, apagar = false) {
    e?.preventDefault();
    setMsgDesc('');
    if (apagar) {
      const error = await guardarAjuste('subscriber_discount', '');
      setDesc({ porcentaje: '', tipos: [], hasta: '' });
      setMsgDesc(error || 'Descuento apagado.');
      return;
    }
    const pct = Math.round(Number(desc.porcentaje));
    if (!(pct >= 1 && pct <= 90)) {
      setMsgDesc('Error: el descuento tiene que estar entre 1 % y 90 %.');
      return;
    }
    if (desc.tipos.length === 0) {
      setMsgDesc('Error: marca al menos en qué se aplica.');
      return;
    }
    const hasta = desc.hasta ? new Date(desc.hasta) : null;
    if (hasta && (Number.isNaN(hasta.getTime()) || hasta <= new Date())) {
      setMsgDesc('Error: la fecha de fin tiene que ser futura (o déjala vacía).');
      return;
    }
    const error = await guardarAjuste(
      'subscriber_discount',
      JSON.stringify({ porcentaje: pct, tipos: desc.tipos, hasta: hasta ? hasta.toISOString() : null })
    );
    setMsgDesc(error || '¡Descuento guardado!');
  }

  const marcarTipo = (valor, marcado) =>
    setDesc({ ...desc, tipos: marcado ? [...new Set([...desc.tipos, valor])] : desc.tipos.filter((t) => t !== valor) });

  // --- Próximamente ---
  async function guardarProximamente(vaciar = false) {
    setMsgProx('');
    const texto = vaciar ? '' : proximamente.trim();
    const error = await guardarAjuste('coming_soon', texto);
    if (vaciar) setProximamente('');
    setMsgProx(error || (texto ? '¡Guardado! Ya sale en el área de clientes.' : 'Quitado: el bloque ya no sale.'));
  }

  // --- Votaciones ---
  async function crearVotacion(e) {
    e.preventDefault();
    setMsgVot('');
    const opciones = nueva.opciones.split(/\r?\n/).map((o) => o.trim()).filter(Boolean);
    const abierta = votaciones.find((v) => v.abierta);
    if (abierta && !window.confirm('Ya hay una votación abierta. Si creas otra, la anterior se cierra. ¿Seguir?')) return;
    try {
      await llamarApi('POST', { accion: 'crearVotacion', pregunta: nueva.pregunta, opciones });
      setNueva({ pregunta: '', opciones: '' });
      setMsgVot('¡Votación publicada! Ya la ven los suscriptores.');
      setVotaciones((await llamarApi('GET', { seccion: 'votaciones' })).votaciones || []);
    } catch (err) {
      setMsgVot(`Error: ${err.message}`);
    }
  }

  async function accionVotacion(accion, v) {
    if (accion === 'borrarVotacion' && !window.confirm(`¿Borrar la votación «${v.pregunta}» y todos sus votos?`)) return;
    try {
      await llamarApi('POST', { accion, id: v.id });
      setVotaciones((await llamarApi('GET', { seccion: 'votaciones' })).votaciones || []);
    } catch (err) {
      setMsgVot(`Error: ${err.message}`);
    }
  }

  // --- Cupo de revisiones ---
  async function guardarCupo(e) {
    e.preventDefault();
    const n = Math.round(Number(cupo));
    if (!(n >= 0 && n <= 500)) {
      setMsgCupo('Error: pon un número entre 0 y 500 (0 = revisiones cerradas).');
      return;
    }
    const error = await guardarAjuste('review_quota', String(n));
    setMsgCupo(error || '¡Cupo guardado!');
  }

  // --- Cierre del área ---
  async function avisarCierre() {
    setMsgCierre('');
    const fecha = fechaCierre ? new Date(fechaCierre) : null;
    const texto = fecha ? fecha.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
    const escrito = window.prompt(
      `Vas a anunciar que el área de clientes cierra el ${texto}. Se enviará un correo a TODOS los suscriptores (mensuales y de por vida) y se dejará de vender la de por vida.\n\nEscribe CERRAR para confirmar:`
    );
    if (escrito !== 'CERRAR') {
      setMsgCierre('No se ha enviado nada.');
      return;
    }
    try {
      const d = await llamarApi('POST', { accion: 'avisarCierre', fecha: fecha ? fecha.toISOString() : null });
      setCierre({ aviso: new Date().toISOString(), cierre: d.cierre });
      setMsgCierre(
        `Aviso enviado a ${d.avisados} de ${d.suscriptores} suscriptores.` + (d.errorCorreo ? ` OJO: fallo al enviar correos (${d.errorCorreo}).` : '')
      );
    } catch (e) {
      setMsgCierre(`Error: ${e.message}`);
    }
  }

  async function anularCierre() {
    if (!window.confirm('¿Anular el cierre anunciado? Se vuelve a vender la de por vida. (No se manda ningún correo: si ya avisaste, cuéntaselo tú a los suscriptores.)')) return;
    try {
      await llamarApi('POST', { accion: 'anularCierre' });
      setCierre(null);
      setMsgCierre('Cierre anulado.');
    } catch (e) {
      setMsgCierre(`Error: ${e.message}`);
    }
  }

  return (
    <AdminGuard>
      <Head>
        <title>Área de clientes: extras — Panel</title>
      </Head>
      <AdminHeader title="Área de clientes: extras" />
      <div className="mx-auto max-w-5xl px-5 py-10">
        <div className="mb-8 flex flex-wrap gap-3">
          <Link href="/admin/revisiones" className={botonLleno}>
            Revisiones de temas →
          </Link>
          <Link href="/admin/clientes" className={botonBorde}>
            Clientes e insignias →
          </Link>
        </div>

        {cargando ? (
          <p className="text-sm text-muted">Cargando…</p>
        ) : (
          <>
            {/* DE POR VIDA */}
            <div className={caja}>
              <h2 className={titulo}>Suscripción de por vida</h2>
              <p className={ayuda}>
                Pago único. Con tarjeta se puede pagar en 3 plazos (Klarna) y con PayPal también (Paga en 3 plazos), y a ti se te paga entero al momento.
              </p>
              <form onSubmit={guardarVida} className="space-y-5">
                <div className="flex items-center gap-3">
                  <input value={precioVida} onChange={(e) => setPrecioVida(e.target.value)} className={`${campo} w-32`} />
                  <span className="text-muted">€ (precio normal)</span>
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-paper">
                  <input type="checkbox" checked={ofertaVida.activa} onChange={(e) => setOfertaVida({ ...ofertaVida, activa: e.target.checked })} />
                  Oferta por tiempo limitado (el precio normal sale tachado al lado)
                </label>
                {ofertaVida.activa && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className={etiqueta}>Empieza</label>
                      <input type="datetime-local" value={ofertaVida.inicio} onChange={(e) => setOfertaVida({ ...ofertaVida, inicio: e.target.value })} className={`${campo} w-full [color-scheme:dark]`} />
                      <p className="mt-1 text-[11px] text-muted">Vacío = empieza ya al guardar.</p>
                    </div>
                    <div>
                      <label className={etiqueta}>Termina</label>
                      <input type="datetime-local" value={ofertaVida.fin} onChange={(e) => setOfertaVida({ ...ofertaVida, fin: e.target.value })} className={`${campo} w-full [color-scheme:dark]`} />
                    </div>
                    <div>
                      <label className={etiqueta}>Tipo</label>
                      <select value={ofertaVida.tipo} onChange={(e) => setOfertaVida({ ...ofertaVida, tipo: e.target.value })} className={`${campo} w-full`}>
                        <option value="precio">Precio nuevo (€)</option>
                        <option value="porcentaje">Descuento en %</option>
                      </select>
                    </div>
                    <div>
                      <label className={etiqueta}>{ofertaVida.tipo === 'porcentaje' ? 'Descuento (%)' : 'Precio de oferta (€)'}</label>
                      <input type="number" min="0" step={ofertaVida.tipo === 'porcentaje' ? '1' : '0.01'} value={ofertaVida.valor} onChange={(e) => setOfertaVida({ ...ofertaVida, valor: e.target.value })} className={`${campo} w-full`} />
                    </div>
                  </div>
                )}
                <button type="submit" className={botonLleno}>
                  Guardar
                </button>
                <Mensaje texto={msgVida} />
              </form>
            </div>

            {/* DESCUENTO SUSCRIPTORES */}
            <div className={caja}>
              <h2 className={titulo}>Descuento para suscriptores</h2>
              <p className={ayuda}>
                Lo ven y lo pagan solo los suscriptores (mensuales y de por vida) con su sesión iniciada; el resto ve «Suscriptores: −X % en esto» para animarse. No se suma a las ofertas: si algo ya está de oferta, se queda con el precio de la oferta. Puedes cambiarlo cada mes: por ejemplo, este mes en clases y el que viene en la tienda.
              </p>
              <form onSubmit={guardarDescuento} className="space-y-5">
                <div className="flex items-center gap-3">
                  <input type="number" min="1" max="90" value={desc.porcentaje} onChange={(e) => setDesc({ ...desc, porcentaje: e.target.value })} className={`${campo} w-24`} />
                  <span className="text-muted">% de descuento</span>
                </div>
                <div className="flex flex-wrap gap-5">
                  {TIPOS_DESCUENTO.map((t) => (
                    <label key={t.valor} className="flex cursor-pointer items-center gap-2 text-sm text-paper">
                      <input type="checkbox" checked={desc.tipos.includes(t.valor)} onChange={(e) => marcarTipo(t.valor, e.target.checked)} />
                      {t.texto}
                    </label>
                  ))}
                </div>
                <div className="max-w-xs">
                  <label className={etiqueta}>Hasta (opcional)</label>
                  <input type="datetime-local" value={desc.hasta} onChange={(e) => setDesc({ ...desc, hasta: e.target.value })} className={`${campo} w-full [color-scheme:dark]`} />
                  <p className="mt-1 text-[11px] text-muted">Vacío = hasta que lo cambies. Al llegar la fecha se apaga solo.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button type="submit" className={botonLleno}>
                    Guardar descuento
                  </button>
                  <button type="button" onClick={(e) => guardarDescuento(e, true)} className="text-xs text-muted underline hover:text-paper">
                    Apagar descuento
                  </button>
                </div>
                <Mensaje texto={msgDesc} />
              </form>
            </div>

            {/* PRÓXIMAMENTE */}
            <div className={caja}>
              <h2 className={titulo}>Próximamente</h2>
              <p className={ayuda}>Lo que vas a subir pronto. Solo sale en el área de clientes si aquí hay algo escrito (lo ven suscritos y no suscritos).</p>
              <textarea
                rows={4}
                value={proximamente}
                onChange={(e) => setProximamente(e.target.value)}
                placeholder="Ej.: En noviembre: kit de percusión tribal y un post sobre cómo mezclar voces de reggaeton."
                className={`${campo} w-full`}
              />
              <div className="mt-3 flex flex-wrap gap-3">
                <button type="button" onClick={() => guardarProximamente(false)} className={botonLleno}>
                  Guardar
                </button>
                <button type="button" onClick={() => guardarProximamente(true)} className="text-xs text-muted underline hover:text-paper">
                  Quitar el bloque
                </button>
              </div>
              <Mensaje texto={msgProx} />
            </div>

            {/* VOTACIONES */}
            <div className={caja}>
              <h2 className={titulo}>Votaciones</h2>
              <p className={ayuda}>Escribe la pregunta y las opciones; los suscriptores votan y ven el resultado después de votar. Solo hay una abierta a la vez.</p>
              <form onSubmit={crearVotacion} className="space-y-4">
                <div>
                  <label className={etiqueta}>Pregunta</label>
                  <input maxLength={200} value={nueva.pregunta} onChange={(e) => setNueva({ ...nueva, pregunta: e.target.value })} placeholder="¿Qué kit queréis el mes que viene?" className={`${campo} w-full`} />
                </div>
                <div>
                  <label className={etiqueta}>Opciones (una por línea, de 2 a 8)</label>
                  <textarea rows={4} value={nueva.opciones} onChange={(e) => setNueva({ ...nueva, opciones: e.target.value })} placeholder={'Kit de percusión tribal\nKit de reggaeton old school\nPresets de voces'} className={`${campo} w-full`} />
                </div>
                <button type="submit" className={botonLleno}>
                  Publicar votación
                </button>
              </form>
              <Mensaje texto={msgVot} />

              {votaciones.length > 0 && (
                <div className="mt-8 space-y-4">
                  {votaciones.map((v) => (
                    <div key={v.id} className="rounded-sm border border-white/10 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-paper">{v.pregunta}</p>
                          <p className="text-[11px] uppercase tracking-widest text-muted">
                            {v.abierta ? '🟢 Abierta' : '⚪ Cerrada'} · {v.total} {v.total === 1 ? 'voto' : 'votos'} · {new Date(v.created_at).toLocaleDateString('es-ES')}
                          </p>
                        </div>
                        <div className="flex gap-3 text-xs">
                          {v.abierta && (
                            <button type="button" onClick={() => accionVotacion('cerrarVotacion', v)} className="text-signal hover:underline">
                              Cerrar
                            </button>
                          )}
                          <button type="button" onClick={() => accionVotacion('borrarVotacion', v)} className="text-volt hover:underline">
                            Borrar
                          </button>
                        </div>
                      </div>
                      <div className="mt-3 space-y-1.5">
                        {(v.opciones || []).map((o, i) => {
                          const pct = v.total ? Math.round((v.resultados[i] / v.total) * 100) : 0;
                          return (
                            <div key={i} className="relative overflow-hidden rounded-sm bg-white/5 px-3 py-1.5 text-xs">
                              <div className="absolute inset-y-0 left-0 bg-volt/20" style={{ width: `${pct}%` }} aria-hidden="true" />
                              <div className="relative flex justify-between gap-3 text-paper">
                                <span>{o}</span>
                                <span className="text-muted">
                                  {v.resultados[i]} · {pct} %
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* REVISIONES */}
            <div className={caja}>
              <h2 className={titulo}>Revisiones de temas</h2>
              <p className={ayuda}>
                Cada suscriptor puede mandar 1 tema al mes. Cuando se llena el cupo del mes, los demás ven un aviso para que lo intenten el mes siguiente.
              </p>
              <form onSubmit={guardarCupo} className="flex flex-wrap items-center gap-3">
                <input type="number" min="0" max="500" value={cupo} onChange={(e) => setCupo(e.target.value)} className={`${campo} w-24`} />
                <span className="text-muted">revisiones al mes en total (0 = cerradas)</span>
                <button type="submit" className={botonLleno}>
                  Guardar cupo
                </button>
              </form>
              <Mensaje texto={msgCupo} />
            </div>

            {/* CIERRE DEL ÁREA DE CLIENTES */}
            <div className="mb-10 rounded-sm border border-red-500/30 bg-surface p-6">
              <h2 className={titulo}>Cerrar el área de clientes (si algún día hiciera falta)</h2>
              <p className={ayuda}>
                Recordatorio: en las condiciones de venta prometemos que, si algún día cerramos el área de clientes, avisaremos
                a los suscriptores (sobre todo a los de por vida) con <strong className="text-paper">al menos {DIAS_AVISO_CIERRE} días</strong> de
                antelación para que descarguen su contenido. Este botón lo hace todo: manda el correo a cada suscriptor, pone un
                aviso en su área con la fecha y deja de vender la de por vida. El área no se cierra sola: llegada la fecha, la
                cierras tú.
              </p>
              {cierre ? (
                <div className="space-y-3">
                  <p className="text-sm text-paper">
                    🔴 Cierre anunciado el {cierre.aviso ? new Date(cierre.aviso).toLocaleDateString('es-ES') : '—'} para el{' '}
                    <strong>{new Date(cierre.cierre).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>.
                  </p>
                  <button type="button" onClick={anularCierre} className="text-xs text-muted underline hover:text-paper">
                    Anular el cierre
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap items-end gap-3">
                  <div>
                    <label className={etiqueta}>Fecha de cierre (mínimo {DIAS_AVISO_CIERRE} días desde hoy)</label>
                    <input
                      type="datetime-local"
                      value={fechaCierre}
                      onChange={(e) => setFechaCierre(e.target.value)}
                      className={`${campo} [color-scheme:dark]`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={avisarCierre}
                    className="rounded-sm border border-red-500 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-red-400 hover:bg-red-500 hover:text-ink"
                  >
                    Avisar del cierre a los suscriptores
                  </button>
                </div>
              )}
              <Mensaje texto={msgCierre} />
            </div>
          </>
        )}
      </div>
    </AdminGuard>
  );
}
