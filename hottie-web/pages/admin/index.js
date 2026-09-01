import { useEffect, useState } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import AdminGuard from '../../components/AdminGuard';
import AdminHeader from '../../components/AdminHeader';
import { supabase } from '../../lib/supabaseClient';
import { formatPrice } from '../../lib/format';

function Section({ title, items, kind, onToggle, onDelete }) {
  const getBaseUrl = () => {
    if (kind === 'productos') return '/admin/productos';
    if (kind === 'servicios') return '/admin/servicios';
    return '/admin/clases';
  };

  const baseUrl = getBaseUrl();

  return (
    <div className="mb-12">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-2xl tracking-wide text-paper">{title}</h2>
        <Link
          href={`${baseUrl}/nuevo`}
          className="rounded-sm bg-volt px-4 py-2 text-xs font-semibold uppercase tracking-widest text-ink hover:brightness-110"
        >
          + Añadir
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted">Todavía no has añadido nada aquí.</p>
      ) : (
        <div className="overflow-hidden rounded-sm border border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface2 text-xs uppercase tracking-widest text-muted">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Precio</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-white/10 bg-surface">
                  <td className="px-4 py-3 text-paper">{item.name}</td>
                  <td className="px-4 py-3 text-muted">{formatPrice(item.price_cents, item.currency)}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => onToggle(item)}
                      className={`rounded-sm px-2 py-1 text-xs uppercase tracking-widest ${
                        item.active ? 'bg-signal/20 text-signal' : 'bg-white/10 text-muted'
                      }`}
                    >
                      {item.active ? 'Publicado' : 'Oculto'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`${baseUrl}/${item.id}`} className="mr-4 text-signal hover:underline">
                      Editar
                    </Link>
                    <button
                      type="button"
                      onClick={() => onDelete(item)}
                      className="text-volt hover:underline"
                    >
                      Borrar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [{ data: p }, { data: s }, { data: c }] = await Promise.all([
      supabase.from('products').select('*').order('sort_order', { ascending: true }),
      supabase.from('services').select('*').order('sort_order', { ascending: true }),
      supabase.from('classes').select('*').order('sort_order', { ascending: true }),
    ]);
    setProducts(p || []);
    setServices(s || []);
    setClasses(c || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleActive(table, item) {
    const { error } = await supabase.from(table).update({ active: !item.active }).eq('id', item.id);
    if (error) {
      alert(`Error al actualizar estado: ${error.message}`);
      return;
    }

    if (table === 'products') {
      setProducts((prev) => prev.map((p) => (p.id === item.id ? { ...p, active: !p.active } : p)));
    } else if (table === 'services') {
      setServices((prev) => prev.map((s) => (s.id === item.id ? { ...s, active: !s.active } : s)));
    } else {
      setClasses((prev) => prev.map((c) => (c.id === item.id ? { ...c, active: !c.active } : c)));
    }
  }

  async function remove(table, item) {
    const { error } = await supabase.from(table).delete().eq('id', item.id);

    if (error) {
      alert(`No se pudo borrar: ${error.message}`);
      console.error('Error al borrar en Supabase:', error);
      return;
    }

    if (table === 'products') {
      setProducts((prev) => prev.filter((p) => p.id !== item.id));
    } else if (table === 'services') {
      setServices((prev) => prev.filter((s) => s.id !== item.id));
    } else {
      setClasses((prev) => prev.filter((c) => c.id !== item.id));
    }
  }

  return (
    <AdminGuard>
      <Head>
        <title>Panel — The Lab</title>
      </Head>
      <AdminHeader />
      <div className="mx-auto max-w-5xl px-5 py-10">
        {loading ? (
          <p className="text-muted">Cargando…</p>
        ) : (
          <>
            <Section
              title="Productos"
              kind="productos"
              items={products}
              onToggle={(item) => toggleActive('products', item)}
              onDelete={(item) => remove('products', item)}
            />
            <Section
              title="Servicios"
              kind="servicios"
              items={services}
              onToggle={(item) => toggleActive('services', item)}
              onDelete={(item) => remove('services', item)}
            />
            <Section
              title="Clases"
              kind="clases"
              items={classes}
              onToggle={(item) => toggleActive('classes', item)}
              onDelete={(item) => remove('classes', item)}
            />
          </>
        )}
      </div>
    </AdminGuard>
  );
}
