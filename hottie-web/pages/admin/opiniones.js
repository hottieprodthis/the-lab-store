import { useEffect, useState } from 'react';
import Head from 'next/head';
import AdminGuard from '../../components/AdminGuard';
import AdminHeader from '../../components/AdminHeader';
import { supabaseAdmin as supabase } from '../../lib/supabaseAdminClient';

// Opiniones de clientes (lib/opiniones.js): aquí se aprueban para que salgan
// en la portada, se ocultan o se borran. Solo admins (RLS de la tabla).
export default function AdminOpiniones() {
  const [opiniones, setOpiniones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  async function cargar() {
    setCargando(true);
    const { data, error: e } = await supabase
      .from('opiniones')
      .select('id, nombre, texto, estrellas, articulo, aprobada, created_at')
      .order('aprobada', { ascending: true })
      .order('created_at', { ascending: false });
    if (e) setError(e.message);
    setOpiniones(data || []);
    setCargando(false);
  }

  useEffect(() => {
    cargar();
  }, []);

  async function cambiar(op, aprobada) {
    const { error: e } = await supabase.from('opiniones').update({ aprobada }).eq('id', op.id);
    if (e) return alert(`No se pudo guardar: ${e.message}`);
    cargar();
  }

  async function borrar(op) {
    if (!confirm(`¿Borrar la opinión de ${op.nombre}? No se puede deshacer y esa compra no podrá volver a opinar.`)) return;
    const { error: e } = await supabase.from('opiniones').delete().eq('id', op.id);
    if (e) return alert(`No se pudo borrar: ${e.message}`);
    cargar();
  }

  const pendientes = opiniones.filter((o) => !o.aprobada);
  const aprobadas = opiniones.filter((o) => o.aprobada);

  const Tarjeta = ({ op }) => (
    <div className={`rounded-sm border p-4 ${op.aprobada ? 'border-white/10 bg-surface' : 'border-volt/40 bg-volt/5'}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-semibold text-paper">
            {op.nombre} <span className="ml-2 text-volt">{'★'.repeat(op.estrellas)}<span className="text-white/20">{'★'.repeat(5 - op.estrellas)}</span></span>
          </p>
          <p className="text-xs text-muted">
            {op.articulo} · {new Date(op.created_at).toLocaleDateString('es-ES')}
          </p>
        </div>
        <div className="flex gap-2">
          {op.aprobada ? (
            <button onClick={() => cambiar(op, false)} className="rounded-sm border border-white/20 px-3 py-1 text-xs uppercase tracking-widest text-paper hover:border-paper">
              Ocultar
            </button>
          ) : (
            <button onClick={() => cambiar(op, true)} className="rounded-sm bg-volt px-3 py-1 text-xs font-semibold uppercase tracking-widest text-ink hover:brightness-110">
              Aprobar
            </button>
          )}
          <button onClick={() => borrar(op)} className="rounded-sm border border-red-500/40 px-3 py-1 text-xs uppercase tracking-widest text-red-400 hover:border-red-400">
            Borrar
          </button>
        </div>
      </div>
      <p className="mt-3 whitespace-pre-line text-sm text-paper/90">{op.texto}</p>
    </div>
  );

  return (
    <AdminGuard>
      <Head>
        <title>Opiniones — Panel</title>
      </Head>
      <AdminHeader title="Opiniones" />
      <div className="mx-auto max-w-5xl px-5 py-10 space-y-10">
        <p className="text-sm text-muted">
          Los clientes reciben un correo pidiendo su opinión unos días después de comprar (y tienen el botón «Opinar» en su área). Las
          opiniones no salen en la web hasta que pulsas «Aprobar». En la web solo se ve el nombre, las estrellas y el texto.
        </p>
        {error && <p className="text-sm text-red-400">{error}</p>}
        {cargando ? (
          <p className="text-muted">Cargando…</p>
        ) : (
          <>
            <section>
              <h2 className="mb-4 font-display text-2xl tracking-wide text-paper">Pendientes ({pendientes.length})</h2>
              {pendientes.length === 0 ? (
                <p className="text-sm text-muted">No hay opiniones pendientes.</p>
              ) : (
                <div className="space-y-3">{pendientes.map((op) => <Tarjeta key={op.id} op={op} />)}</div>
              )}
            </section>
            <section>
              <h2 className="mb-4 font-display text-2xl tracking-wide text-paper">Publicadas ({aprobadas.length})</h2>
              {aprobadas.length === 0 ? (
                <p className="text-sm text-muted">Todavía no hay opiniones publicadas.</p>
              ) : (
                <div className="space-y-3">{aprobadas.map((op) => <Tarjeta key={op.id} op={op} />)}</div>
              )}
            </section>
          </>
        )}
      </div>
    </AdminGuard>
  );
}
