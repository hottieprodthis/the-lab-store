import { useEffect, useState } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import AdminGuard from '../../components/AdminGuard';
import AdminHeader from '../../components/AdminHeader';
import { supabaseAdmin as supabase } from '../../lib/supabaseAdminClient';

function Section({ title, items, kind, onDelete }) {
  const getAddUrl = () => {
    if (kind === 'productos') return '/admin/productos/nuevo';
    if (kind === 'servicios') return '/admin/servicios/nuevo';
    if (kind === 'clases') return '/admin/clases/nuevo';
    return '/admin';
  };

  return (
    <div className="mb-12">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-2xl tracking-wide text-paper">{title}</h2>
        <Link
          href={getAddUrl()}
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
                <th className="px-4 py-3">Título / Nombre</th>
                <th className="px-4 py-3">Detalle / Archivo</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                // Hacemos que busque en todas las posibles columnas de tu base de datos
                const itemName = item.title || item.name || item.nombre || 'Sin título';
                const itemDetail = item.description || item.descripcion || item.content || '';
                const itemFile = item.file_url || item.archivo_url || item.download_url || item.file_key || '';

                return (
                  <tr key={item.id} className="border-t border-white/10 bg-surface">
                    <td className="px-4 py-3 text-paper">{itemName}</td>
                    <td className="px-4 py-3 text-muted">
                      {itemFile 
                        ? `🔗 ${itemFile.substring(0, 40)}${itemFile.length > 40 ? '...' : ''}` 
                        : (itemDetail ? itemDetail.substring(0, 50) + '...' : 'Sin detalles')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/${kind}/${item.id}`} className="mr-4 text-signal hover:underline">
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
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Bloques de estadísticas anuales del panel de admin: qué tipo de artículo
// representa cada uno y la etiqueta que se muestra. "clase" se cuenta como
// "Clases Impartidas" porque cada clase vendida es una clase que toca dar.
const STAT_BLOCKS = [
  { key: 'servicio', label: 'Servicios Vendidos' },
  { key: 'clase', label: 'Clases Impartidas' },
  { key: 'producto', label: 'Productos Vendidos' },
];

export default function AdminDashboard() {
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [classes, setClasses] = useState([]);
  const [posts, setPosts] = useState([]);
  const [packs, setPacks] = useState([]);
  const [subscriptionPrice, setSubscriptionPrice] = useState('7.99');
  const [priceMessage, setPriceMessage] = useState('');
  const [subscribersCount, setSubscribersCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // --- ESTADÍSTICAS ANUALES (clases dadas / servicios y productos vendidos) ---
  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3, currentYear - 4];
  const [statsYear, setStatsYear] = useState(currentYear);
  const [statsData, setStatsData] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [expandedStat, setExpandedStat] = useState(null);

  async function loadStats(year) {
    setStatsLoading(true);
    try {
      // Mandamos el token de la sesión de admin: la ruta comprueba que la
      // cuenta sea admin antes de devolver emails de clientes.
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token || '';
      const res = await fetch(`/api/admin/estadisticas?year=${year}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setStatsData(data);
    } catch (e) {
      console.error('Error cargando estadísticas del panel:', e);
      setStatsData(null);
    }
    setStatsLoading(false);
  }

  useEffect(() => {
    setExpandedStat(null);
    loadStats(statsYear);
  }, [statsYear]);

  async function load() {
    setLoading(true);
    const [
      { data: p }, 
      { data: s }, 
      { data: c }, 
      { data: postsData }, 
      { data: packsData }, 
      { data: settingData }, 
      { count: subCount }
    ] = await Promise.all([
      supabase.from('products').select('*').order('sort_order', { ascending: true }),
      supabase.from('services').select('*').order('sort_order', { ascending: true }),
      supabase.from('classes').select('*').order('sort_order', { ascending: true }),
      supabase.from('posts').select('*').order('created_at', { ascending: false }),
      supabase.from('packs').select('*').order('created_at', { ascending: false }),
      supabase.from('settings').select('value').eq('key', 'subscription_price'),
      supabase.from('suscriptores').select('*', { count: 'exact', head: true }),
    ]);

    setProducts(p || []);
    setServices(s || []);
    setClasses(c || []);
    setPosts(postsData || []);
    setPacks(packsData || []);
    
    if (settingData && settingData.length > 0 && settingData[0].value) {
      setSubscriptionPrice(settingData[0].value);
    }

    setSubscribersCount(subCount || 0);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleUpdatePrice(e) {
    e.preventDefault();
    setPriceMessage('');
    
    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'subscription_price', value: subscriptionPrice }, { onConflict: 'key' });

    if (error) {
      setPriceMessage(`Error: ${error.message}`);
    } else {
      setPriceMessage('¡Precio actualizado correctamente!');
      load();
    }
  }

  async function remove(table, item) {
    if (!confirm('¿Estás seguro de que quieres borrar este elemento?')) return;
    const { error } = await supabase.from(table).delete().eq('id', item.id);
    if (error) {
      alert(`No se pudo borrar: ${error.message}`);
      return;
    }
    load();
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
            {/* CONTROL DE PRECIO DE SUSCRIPCIÓN */}
            <div className="mb-12 rounded-sm border border-white/10 bg-surface p-6">
              <h2 className="font-display text-xl tracking-wide text-paper mb-4">Precio de la Suscripción Mensual (Área Clientes)</h2>
              <form onSubmit={handleUpdatePrice} className="flex items-center gap-4">
                <input
                  type="text"
                  value={subscriptionPrice}
                  onChange={(e) => setSubscriptionPrice(e.target.value)}
                  className="rounded-sm border border-white/20 bg-surface2 px-4 py-2 text-paper focus:outline-none focus:border-volt w-32"
                />
                <span className="text-muted">€ / mes</span>
                <button
                  type="submit"
                  className="rounded-sm bg-volt px-4 py-2 text-xs font-semibold uppercase tracking-widest text-ink hover:brightness-110"
                >
                  Guardar Precio
                </button>
              </form>
              {priceMessage && <p className="mt-3 text-xs text-volt">{priceMessage}</p>}
            </div>

            {/* ESTADÍSTICAS ANUALES */}
            <div className="mb-12">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-2xl tracking-wide text-paper">Estadísticas Anuales</h2>
                <select
                  value={statsYear}
                  onChange={(e) => setStatsYear(Number(e.target.value))}
                  className="rounded-sm border border-white/20 bg-surface2 px-3 py-2 text-sm text-paper focus:outline-none focus:border-volt"
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              {statsLoading ? (
                <p className="text-sm text-muted">Calculando estadísticas…</p>
              ) : !statsData || statsData.error ? (
                <p className="text-sm text-muted">
                  {statsData?.error || 'No se pudieron cargar las estadísticas.'}
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    {STAT_BLOCKS.map(({ key, label }) => {
                      const blockData = statsData.stats?.[key] || { count: 0, breakdown: [] };
                      const isOpen = expandedStat === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setExpandedStat(isOpen ? null : key)}
                          className={`rounded-sm border p-6 text-left transition ${
                            isOpen ? 'border-volt bg-surface2' : 'border-white/10 bg-surface hover:border-white/30'
                          }`}
                        >
                          <p className="text-xs uppercase tracking-widest text-muted">{label}</p>
                          <p className="mt-2 font-display text-4xl text-paper">{blockData.count}</p>
                          <p className="mt-1 text-xs text-signal">{isOpen ? 'Ocultar detalle ▲' : 'Ver detalle ▼'}</p>
                        </button>
                      );
                    })}
                  </div>

                  {expandedStat && (
                    <div className="mt-4 overflow-hidden rounded-sm border border-white/10">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-surface2 text-xs uppercase tracking-widest text-muted">
                          <tr>
                            <th className="px-4 py-3">Cliente</th>
                            <th className="px-4 py-3">Artículo</th>
                            <th className="px-4 py-3">Cantidad</th>
                            <th className="px-4 py-3">Fecha</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(statsData.stats?.[expandedStat]?.breakdown || []).length === 0 ? (
                            <tr>
                              <td colSpan={4} className="px-4 py-3 text-muted">
                                Sin ventas registradas en {statsYear}.
                              </td>
                            </tr>
                          ) : (
                            statsData.stats[expandedStat].breakdown.map((row, i) => (
                              <tr key={i} className="border-t border-white/10 bg-surface">
                                <td className="px-4 py-3 text-paper">{row.email}</td>
                                <td className="px-4 py-3 text-muted">{row.name}</td>
                                <td className="px-4 py-3 text-muted">{row.quantity}</td>
                                <td className="px-4 py-3 text-muted">
                                  {new Date(row.created_at).toLocaleDateString('es-ES')}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>

            <Section
              title="Productos"
              kind="productos"
              items={products}
              onDelete={(item) => remove('products', item)}
            />
            <Section
              title="Servicios"
              kind="servicios"
              items={services}
              onDelete={(item) => remove('services', item)}
            />
            <Section
              title="Clases"
              kind="clases"
              items={classes}
              onDelete={(item) => remove('classes', item)}
            />

            {/* SECCIÓN POSTS EXCLUSIVOS */}
            <div className="mb-12">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-2xl tracking-wide text-paper">Posts Exclusivos (Área Clientes)</h2>
                <Link
                  href="/admin/areaclientes/nuevo-post"
                  className="rounded-sm bg-volt px-4 py-2 text-xs font-semibold uppercase tracking-widest text-ink hover:brightness-110"
                >
                  + Añadir Post
                </Link>
              </div>
              {posts.length === 0 ? (
                <p className="text-sm text-muted">No hay posts exclusivos publicados.</p>
              ) : (
                <div className="overflow-hidden rounded-sm border border-white/10">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-surface2 text-xs uppercase tracking-widest text-muted">
                      <tr>
                        <th className="px-4 py-3">Título</th>
                        <th className="px-4 py-3">Extracto</th>
                        <th className="px-4 py-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {posts.map((post) => (
                        <tr key={post.id} className="border-t border-white/10 bg-surface">
                          <td className="px-4 py-3 text-paper">{post.title || post.name || 'Sin título'}</td>
                          <td className="px-4 py-3 text-muted">{post.content?.substring(0, 60)}...</td>
                          <td className="px-4 py-3 text-right">
                            <Link href={`/admin/areaclientes/${post.id}?type=post`} className="mr-4 text-signal hover:underline">
                              Editar
                            </Link>
                            <button type="button" onClick={() => remove('posts', post)} className="text-volt hover:underline">
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

            {/* SECCIÓN PACKS DE DESCARGA */}
            <div className="mb-12">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-2xl tracking-wide text-paper">Kits / Packs (Área Clientes)</h2>
                <Link
                  href="/admin/areaclientes/nuevo-pack"
                  className="rounded-sm bg-volt px-4 py-2 text-xs font-semibold uppercase tracking-widest text-ink hover:brightness-110"
                >
                  + Añadir Pack
                </Link>
              </div>
              {packs.length === 0 ? (
                <p className="text-sm text-muted">No hay packs de descarga publicados.</p>
              ) : (
                <div className="overflow-hidden rounded-sm border border-white/10">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-surface2 text-xs uppercase tracking-widest text-muted">
                      <tr>
                        <th className="px-4 py-3">Título</th>
                        <th className="px-4 py-3">Archivo / Enlace</th>
                        <th className="px-4 py-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {packs.map((pack) => (
                        <tr key={pack.id} className="border-t border-white/10 bg-surface">
                          <td className="px-4 py-3 text-paper">{pack.title || pack.name || 'Sin título'}</td>
                          <td className="px-4 py-3 text-muted">{pack.file_key || pack.file_url || ''}</td>
                          <td className="px-4 py-3 text-right">
                            <Link href={`/admin/areaclientes/${pack.id}?type=pack`} className="mr-4 text-signal hover:underline">
                              Editar
                            </Link>
                            <button type="button" onClick={() => remove('packs', pack)} className="text-volt hover:underline">
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

            {/* SUSCRIPTORES */}
            <div className="mb-12">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-2xl tracking-wide text-paper">Suscriptores</h2>
                <Link
                  href="/admin/suscriptores"
                  className="rounded-sm bg-volt px-4 py-2 text-xs font-semibold uppercase tracking-widest text-ink hover:brightness-110"
                >
                  Ver Lista
                </Link>
              </div>
              <div className="rounded-sm border border-white/10 bg-surface p-4 text-sm text-muted">
                Total suscriptores newsletter registrados: <span className="font-semibold text-paper">{subscribersCount}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminGuard>
  );
}
