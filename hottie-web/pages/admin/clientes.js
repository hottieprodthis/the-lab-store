import { useEffect, useState } from 'react';
import Head from 'next/head';
import AdminGuard from '../../components/AdminGuard';
import AdminHeader from '../../components/AdminHeader';
import { supabaseAdmin as supabase } from '../../lib/supabaseAdminClient';
import { TEXTO_NIVELES } from '../../lib/insignias';

// Panel: clientes con cuenta, su suscripción, sus compras y sus insignias
// (lib/insignias.js). Las insignias se calculan solas.
export default function AdminClientes() {
  const [clientes, setClientes] = useState(null);
  const [error, setError] = useState('');
  const [filtro, setFiltro] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const r = await fetch('/api/admin/area?seccion=clientes', {
          headers: { Authorization: `Bearer ${data?.session?.access_token || ''}` },
        });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`);
        setClientes(d.clientes || []);
      } catch (e) {
        setError(e.message);
      }
    })();
  }, []);

  const lista = (clientes || []).filter((c) => !filtro || c.email?.toLowerCase().includes(filtro.toLowerCase()));
  const porVida = (clientes || []).filter((c) => c.suscripcion === 'De por vida').length;
  const mensuales = (clientes || []).filter((c) => c.suscripcion.startsWith('Mensual')).length;

  return (
    <AdminGuard>
      <Head>
        <title>Clientes e insignias — Panel</title>
      </Head>
      <AdminHeader title="Clientes e insignias" />
      <div className="mx-auto max-w-5xl px-5 py-10">
        <div className="mb-6 grid gap-4 text-xs text-muted sm:grid-cols-2">
          <div className="rounded-sm border border-white/10 bg-surface p-4">
            <p className="mb-1 font-semibold uppercase tracking-widest text-paper">Por antigüedad</p>
            {TEXTO_NIVELES.antiguedad.map((t) => (
              <p key={t}>{t}</p>
            ))}
          </div>
          <div className="rounded-sm border border-white/10 bg-surface p-4">
            <p className="mb-1 font-semibold uppercase tracking-widest text-paper">Por compras</p>
            {TEXTO_NIVELES.compras.map((t) => (
              <p key={t}>{t}</p>
            ))}
            <p className="mt-1">⭐ Miembro de por vida (quien paga la de por vida)</p>
          </div>
        </div>

        {clientes && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted">
              {clientes.length} cuentas · <strong className="text-volt">{porVida}</strong> de por vida · <strong className="text-paper">{mensuales}</strong> mensuales
            </p>
            <input
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              placeholder="Buscar por correo"
              className="rounded-sm border border-white/20 bg-surface2 px-3 py-2 text-sm text-paper focus:border-volt focus:outline-none"
            />
          </div>
        )}

        {error && <p className="text-sm text-red-400">Error: {error}</p>}
        {!clientes && !error && <p className="text-sm text-muted">Cargando…</p>}

        {clientes && (
          <div className="overflow-x-auto rounded-sm border border-white/10">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-surface2 text-xs uppercase tracking-widest text-muted">
                <tr>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Suscripción</th>
                  <th className="px-4 py-3 text-right">Compras</th>
                  <th className="px-4 py-3">Insignias</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((c) => (
                  <tr key={c.id} className="border-t border-white/10 bg-surface align-top">
                    <td className="px-4 py-3">
                      <p className="text-paper">{c.email}</p>
                      <p className="text-[11px] text-muted">desde {new Date(c.desde).toLocaleDateString('es-ES')}</p>
                    </td>
                    <td className={`px-4 py-3 ${c.suscripcion === 'De por vida' ? 'text-volt' : 'text-paper'}`}>{c.suscripcion}</td>
                    <td className="px-4 py-3 text-right text-paper">{c.compras}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {[c.insignias.porVida, c.insignias.antiguedad, c.insignias.compras?.nombre ? c.insignias.compras : null]
                          .filter(Boolean)
                          .map((i) => (
                            <span key={i.nombre} className="rounded-full border border-white/15 px-2 py-0.5 text-[11px] text-paper">
                              {i.emoji} {i.nombre}
                            </span>
                          ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminGuard>
  );
}
