import { useEffect, useState } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import AdminGuard from '../../components/AdminGuard';
import AdminHeader from '../../components/AdminHeader';
import { supabaseAdmin as supabase } from '../../lib/supabaseAdminClient';
import { aInputFecha, leerOfertaSuscripcion, precioOfertaValido } from '../../lib/ofertas';
import { MENSAJES_OBRAS_POR_DEFECTO, MENSAJE_VACACIONES_POR_DEFECTO, leerAjusteVacaciones } from '../../lib/obras';

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
// representa cada uno y la etiqueta que se muestra. Se cuentan VENTAS: el
// sistema no sabe si el cliente llegó a asistir a la clase, solo que la
// compró, así que la etiqueta dice "Clases Vendidas" y no "impartidas".
const STAT_BLOCKS = [
  { key: 'servicio', label: 'Servicios Vendidos' },
  { key: 'clase', label: 'Clases Vendidas' },
  { key: 'producto', label: 'Productos Vendidos' },
];

// Primer año que aparece en el selector de estadísticas anuales.
const STATS_START_YEAR = 2026;

export default function AdminDashboard() {
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [classes, setClasses] = useState([]);
  const [posts, setPosts] = useState([]);
  const [packs, setPacks] = useState([]);
  const [subscriptionPrice, setSubscriptionPrice] = useState('7.99');
  const [priceMessage, setPriceMessage] = useState('');
  // Oferta de la suscripción (settings "subscription_offer", ver lib/ofertas.js).
  const [subOferta, setSubOferta] = useState({ activa: false, tipo: 'porcentaje', valor: '', inicio: '', fin: '' });
  const [subOfertaMsg, setSubOfertaMsg] = useState('');
  const [opinionesPendientes, setOpinionesPendientes] = useState(0);
  // Interruptores "Web en obras", "Solo portada y contacto" y "Compras
  // cerradas" (lib/obras.js): guardan el mismo ajuste con su modo.
  const [obras, setObras] = useState({ activa: false, mensajes: {}, modo: 'obras' });
  const [obrasMsg, setObrasMsg] = useState('');
  // Interruptor "De vacaciones" (lib/obras.js)
  const [vacaciones, setVacaciones] = useState({ activa: false, mensaje: '', vuelta: '' });
  const [vacacionesMsg, setVacacionesMsg] = useState('');
  const [subscribersCount, setSubscribersCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // --- ESTADÍSTICAS ANUALES (clases dadas / servicios y productos vendidos) ---
  const currentYear = new Date().getFullYear();
  // El selector va del año actual hacia atrás hasta STATS_START_YEAR (el
  // año en que empezó la tienda). Se recalcula solo con la fecha del
  // dispositivo: en 2027 saldrá 2027 y 2026, en 2028 saldrá 2028, 2027 y
  // 2026, y así sucesivamente, sin tocar el código.
  const yearOptions = [];
  for (let y = currentYear; y >= STATS_START_YEAR; y--) yearOptions.push(y);
  const [statsYear, setStatsYear] = useState(currentYear);
  const [statsData, setStatsData] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [expandedStat, setExpandedStat] = useState(null);

  async function loadStats(year, silent = false) {
    if (!silent) setStatsLoading(true);
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

  // --- BORRAR COMPRAS DE LAS ESTADÍSTICAS ---
  // Borrado DEFINITIVO (ver pages/api/admin/borrar-compras.js): la compra
  // desaparece de las estadísticas y del historial del cliente, y deja de
  // gastar cupo. Siempre se pide confirmación antes.
  const [statsMsg, setStatsMsg] = useState('');
  const [statsBorrando, setStatsBorrando] = useState(false);
  const [clienteABorrar, setClienteABorrar] = useState('');

  async function borrarCompras(cuerpo, textoConfirmacion) {
    if (!window.confirm(textoConfirmacion)) return;
    setStatsMsg('');
    setStatsBorrando(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token || '';
      const res = await fetch('/api/admin/borrar-compras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(cuerpo),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setStatsMsg(data?.error || 'No se pudo borrar.');
      } else {
        setStatsMsg(
          data.articulos === 1
            ? 'Borrado: 1 artículo.'
            : `Borrados: ${data.articulos} artículos (${data.compras} compras).`
        );
        setClienteABorrar('');
        await loadStats(statsYear, true);
        loadLimits(); // el cupo semanal/mensual se libera al borrar
      }
    } catch (e) {
      console.error('Error borrando compras:', e);
      setStatsMsg('No se pudo borrar. Inténtalo de nuevo.');
    }
    setStatsBorrando(false);
  }

  useEffect(() => {
    setExpandedStat(null);
    loadStats(statsYear);
  }, [statsYear]);

  // --- LÍMITE SEMANAL DE SERVICIOS Y CLASES ---
  // Tres límites por semana natural (lunes a domingo): servicios, clases
  // sueltas (1 h, 2 h… una sola sesión) y clases de 12 horas; y un cuarto por
  // MES natural: seguimientos. Vacío = valor por defecto (5 / 4 / 1 / 1);
  // 0 = no aceptar compras de ese tipo en ese periodo. Una semana con una
  // clase de 12 h no admite clases sueltas y al revés (lo aplica el
  // servidor). Se guarda a través de /api/admin/limites (que comprueba que la
  // cuenta sea admin).
  const [limitServicios, setLimitServicios] = useState('');
  const [limitCortas, setLimitCortas] = useState('');
  const [limitLargas, setLimitLargas] = useState('');
  const [limitSeguimiento, setLimitSeguimiento] = useState('');
  const [limitEstado, setLimitEstado] = useState(null);
  const [limitMsg, setLimitMsg] = useState('');
  const [limitSaving, setLimitSaving] = useState(false);

  async function llamarLimites(metodo, cuerpo) {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token || '';
    const res = await fetch('/api/admin/limites', {
      method: metodo,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(cuerpo ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(cuerpo ? { body: JSON.stringify(cuerpo) } : {}),
    });
    return res.json();
  }

  function aplicarEstadoLimites(estado) {
    setLimitEstado(estado);
    const g = estado.guardados || {};
    setLimitServicios(g.servicios === null || g.servicios === undefined ? '' : String(g.servicios));
    setLimitCortas(g.cortas === null || g.cortas === undefined ? '' : String(g.cortas));
    setLimitLargas(g.largas === null || g.largas === undefined ? '' : String(g.largas));
    setLimitSeguimiento(g.seguimiento === null || g.seguimiento === undefined ? '' : String(g.seguimiento));
  }

  async function loadLimits() {
    try {
      const data = await llamarLimites('GET');
      if (data?.ok && data?.semana) {
        aplicarEstadoLimites(data);
      } else {
        setLimitMsg(data?.error || 'No se pudieron cargar los límites.');
      }
    } catch (e) {
      console.error('Error cargando límites semanales:', e);
      setLimitMsg('No se pudieron cargar los límites.');
    }
  }

  useEffect(() => {
    loadLimits();
  }, []);

  async function handleSaveLimits(e) {
    e.preventDefault();
    setLimitMsg('');
    setLimitSaving(true);
    try {
      const data = await llamarLimites('POST', {
        servicios: limitServicios,
        cortas: limitCortas,
        largas: limitLargas,
        seguimiento: limitSeguimiento,
      });
      if (data?.ok && data?.semana) {
        aplicarEstadoLimites(data);
        setLimitMsg('¡Límites guardados correctamente!');
      } else {
        setLimitMsg(`Error: ${data?.error || 'no se pudieron guardar los límites.'}`);
      }
    } catch (err) {
      console.error('Error guardando límites semanales:', err);
      setLimitMsg('Error: no se pudieron guardar los límites.');
    }
    setLimitSaving(false);
  }

  function resumenLimite(bloque) {
    if (!bloque) return '';
    return `${bloque.used} de ${bloque.limit}`;
  }

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
      // Solo los que han confirmado su email (los pendientes no reciben nada).
      supabase.from('suscriptores').select('*', { count: 'exact', head: true }).eq('confirmado', true),
    ]);

    setProducts(p || []);
    setServices(s || []);
    setClasses(c || []);
    setPosts(postsData || []);
    setPacks(packsData || []);
    
    if (settingData && settingData.length > 0 && settingData[0].value) {
      setSubscriptionPrice(settingData[0].value);
    }

    const { data: ofertaData } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'subscription_offer')
      .maybeSingle();
    const o = leerOfertaSuscripcion(ofertaData?.value);
    setSubOferta({
      activa: Boolean(o?.oferta_tipo),
      tipo: o?.oferta_tipo || 'porcentaje',
      valor: o?.oferta_valor !== undefined && o?.oferta_valor !== null ? String(o.oferta_valor) : '',
      inicio: aInputFecha(o?.oferta_inicio),
      fin: aInputFecha(o?.oferta_fin),
    });

    const { data: obrasData } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'maintenance')
      .maybeSingle();
    let ob = {};
    try {
      ob = JSON.parse(obrasData?.value || '{}');
    } catch (e) {}
    setObras({
      activa: Boolean(ob.activa),
      mensajes: ob.mensajes && typeof ob.mensajes === 'object' ? ob.mensajes : {},
      modo: ['privada', 'compras'].includes(ob.modo) ? ob.modo : 'obras',
    });

    const { data: vacData } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'vacation')
      .maybeSingle();
    let va = {};
    try {
      va = JSON.parse(vacData?.value || '{}');
    } catch (e) {}
    // Si la fecha de vuelta ya pasó, cuenta como desactivado (se abre solo).
    setVacaciones({
      activa: Boolean(leerAjusteVacaciones(vacData?.value)),
      mensaje: va.mensaje || '',
      vuelta: va.vuelta || '',
    });

    const { count: opCount } = await supabase
      .from('opiniones')
      .select('id', { count: 'exact', head: true })
      .eq('aprobada', false);
    setOpinionesPendientes(opCount || 0);

    setSubscribersCount(subCount || 0);
    setLoading(false);
  }

  async function guardarVacaciones(activa) {
    setVacacionesMsg('');
    const hoy = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' });
    if (activa && vacaciones.vuelta && vacaciones.vuelta <= hoy) {
      setVacacionesMsg('Error: la fecha de vuelta tiene que ser posterior a hoy (o déjala vacía).');
      return;
    }
    if (activa && !vacaciones.activa && !confirm('Se mostrará el aviso de vacaciones en Servicios y Clases y no se podrán reservar. La tienda seguirá vendiendo. ¿Activar?')) {
      return;
    }
    const nuevo = { activa, mensaje: vacaciones.mensaje.trim(), vuelta: vacaciones.vuelta };
    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'vacation', value: JSON.stringify(nuevo) }, { onConflict: 'key' });
    if (error) {
      setVacacionesMsg(`Error: ${error.message}`);
      return;
    }
    setVacaciones({ ...vacaciones, activa });
    setVacacionesMsg(
      activa ? '¡Buenas vacaciones! Aviso activado.' : vacaciones.activa ? 'De vuelta: ya se puede reservar.' : 'Datos guardados.'
    );
  }

  async function guardarObras(activa, modo = obras.modo) {
    setObrasMsg('');
    const cambia = activa && (!obras.activa || modo !== obras.modo);
    const aviso = {
      obras: 'Toda la web mostrará el aviso de obras (salvo Contacto y las páginas legales) y nadie podrá pagar nada. Tú, con esta sesión, lo ves todo y puedes pagar para probar. ¿Activar?',
      privada: 'Solo se verán la portada y Contacto (y las páginas legales). Todo lo demás mostrará el aviso de obras y nadie podrá pagar nada, ni la suscripción. Tú, con esta sesión, lo ves todo y puedes pagar para probar. ¿Activar?',
      compras: 'Se verán la portada, Contacto, la FAQ y el área de clientes. Tienda, Servicios y Clases mostrarán el aviso y nadie podrá pagar nada (solo renovar la suscripción quien ya era cliente). Tú, con esta sesión, lo ves todo y puedes pagar para probar. ¿Activar?',
    }[modo];
    if (cambia && !confirm(aviso)) {
      return;
    }
    const mensajes = {};
    for (const [m, texto] of Object.entries(obras.mensajes || {})) {
      if (String(texto || '').trim()) mensajes[m] = String(texto).trim();
    }
    const nuevo = { activa, modo, mensajes };
    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'maintenance', value: JSON.stringify(nuevo) }, { onConflict: 'key' });
    if (error) {
      setObrasMsg(`Error: ${error.message}`);
      return;
    }
    setObras({ ...obras, activa, modo });
    setObrasMsg(
      cambia
        ? {
            obras: 'Web en obras activada: toda la web muestra el aviso.',
            privada: 'Activado: solo se ven la portada y Contacto.',
            compras: 'Compras cerradas activadas.',
          }[modo]
        : !activa && obras.activa
          ? 'Web abierta de nuevo: ya se puede comprar.'
          : 'Mensaje guardado.'
    );
  }

  useEffect(() => {
    load();
  }, []);

  async function handleUpdatePrice(e) {
    e.preventDefault();
    setPriceMessage('');

    // Lo hace el servidor (pages/api/admin/precio-suscripcion.js): guarda el
    // precio, lo aplica a las suscripciones con tarjeta en sus próximos cobros
    // (si sube, tras 30 días de aviso) y avisa por correo a los suscriptores.
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token || '';
    const cabeceras = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

    try {
      const info = await fetch('/api/admin/precio-suscripcion', { headers: cabeceras }).then((r) => r.json());
      if (info?.activos > 0) {
        const ok = window.confirm(
          `Hay ${info.activos} ${info.activos === 1 ? 'suscriptor activo' : 'suscriptores activos'}. ` +
            `Se le${info.activos === 1 ? '' : 's'} enviará un correo avisando del nuevo precio.\n\n` +
            `Si el precio SUBE, lo pagarán a partir de su primera renovación pasados ${info.diasAviso} días. ` +
            `Si BAJA, desde su próxima renovación.\n\n¿Guardar el nuevo precio?`
        );
        if (!ok) return;
      }

      const res = await fetch('/api/admin/precio-suscripcion', {
        method: 'POST',
        headers: cabeceras,
        body: JSON.stringify({ precio: subscriptionPrice }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPriceMessage(`Error: ${data.error || 'no se pudo guardar'}`);
        return;
      }
      if (data.sinCambios || !data.activos) {
        setPriceMessage('¡Precio actualizado correctamente!');
      } else {
        const fecha = new Date(data.desde).toLocaleDateString('es-ES', { timeZone: 'Europe/Madrid' });
        setPriceMessage(
          `¡Precio actualizado! Avisados ${data.avisados} de ${data.activos} suscriptores. ` +
            (data.sube ? `Lo pagarán a partir de su primera renovación desde el ${fecha}.` : 'Lo pagarán desde su próxima renovación.') +
            (data.errorCorreo ? ` OJO: fallo al enviar correos (${data.errorCorreo}).` : '') +
            (data.fallosStripe?.length ? ` OJO: no se pudo cambiar en Stripe a: ${data.fallosStripe.join(', ')}.` : '')
        );
      }
      load();
    } catch (err) {
      setPriceMessage(`Error: ${err.message}`);
    }
  }

  async function handleGuardarOfertaSuscripcion(e) {
    e.preventDefault();
    setSubOfertaMsg('');
    let valor = ''; // vacío = sin oferta
    if (subOferta.activa) {
      const inicio = subOferta.inicio ? new Date(subOferta.inicio) : new Date();
      const fin = subOferta.fin ? new Date(subOferta.fin) : null;
      const normal = parseFloat(String(subscriptionPrice).replace(',', '.'));
      const v = parseFloat(subOferta.valor);
      if (!fin || Number.isNaN(fin.getTime()) || Number.isNaN(inicio.getTime()) || fin <= inicio) {
        setSubOfertaMsg('Error: elige una fecha de fin posterior a la de inicio.');
        return;
      }
      if (subOferta.tipo === 'porcentaje' ? !(v >= 1 && v <= 99) : !(precioOfertaValido(v, normal) && v >= 0.5)) {
        setSubOfertaMsg(
          subOferta.tipo === 'porcentaje'
            ? 'Error: el descuento tiene que estar entre 1 % y 99 %.'
            : 'Error: el precio de oferta tiene que ser menor que el normal y de al menos 0,50 €.'
        );
        return;
      }
      valor = JSON.stringify({
        oferta_tipo: subOferta.tipo,
        oferta_valor: v,
        oferta_inicio: inicio.toISOString(),
        oferta_fin: fin.toISOString(),
      });
    }
    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'subscription_offer', value: valor }, { onConflict: 'key' });
    if (error) {
      setSubOfertaMsg(`Error: ${error.message}`);
    } else {
      setSubOfertaMsg(subOferta.activa ? '¡Oferta guardada!' : 'Oferta quitada.');
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
            {/* WEB EN OBRAS */}
            <div
              className={`mb-12 rounded-sm border p-6 ${obras.activa ? 'border-volt bg-volt/10' : 'border-white/10 bg-surface'}`}
            >
              {[
                {
                  modo: 'obras',
                  titulo: 'Web en obras',
                  activo: 'ACTIVADA: toda la web muestra el aviso (salvo Contacto y las páginas legales) y nadie puede pagar nada. Tú (con esta sesión) lo ves todo y puedes pagar para probar.',
                  apagado: 'Tapa toda la web con el aviso de obras (salvo Contacto y las páginas legales). Nadie puede pagar nada.',
                  boton: 'Poner en obras',
                },
                {
                  modo: 'privada',
                  titulo: 'Solo portada y contacto',
                  activo: 'ACTIVADO: los visitantes solo ven la portada y Contacto (y las páginas legales). Nadie puede pagar nada, ni la suscripción. Tú (con esta sesión) lo ves todo y puedes pagar para probar.',
                  apagado: 'Para enseñar la web (por ejemplo, en Instagram) sin abrir todavía: solo se ven la portada y Contacto, y solo tú puedes pagar para hacer pruebas.',
                  boton: 'Activar',
                },
                {
                  modo: 'compras',
                  titulo: 'Compras cerradas',
                  activo: 'ACTIVADO: se ven la portada, Contacto, la FAQ y el área de clientes. Tienda, Servicios y Clases muestran el aviso y nadie puede pagar nada (solo renovar la suscripción quien ya era cliente). Tú (con esta sesión) lo ves todo y puedes pagar para probar.',
                  apagado: 'Se ven la portada, Contacto, la FAQ y el área de clientes. Se tapan Tienda, Servicios y Clases y nadie puede comprar ni suscribirse por primera vez.',
                  boton: 'Activar',
                },
              ].map((m, i) => {
                const encendido = obras.activa && obras.modo === m.modo;
                return (
                  <div key={m.modo} className={i ? 'mt-5 border-t border-white/10 pt-5' : ''}>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="max-w-xl">
                        <h2 className="font-display text-xl tracking-wide text-paper">{m.titulo}</h2>
                        <p className="mt-1 text-xs text-muted">{encendido ? m.activo : m.apagado}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => guardarObras(!encendido, m.modo)}
                        className={`rounded-sm px-4 py-2 text-xs font-semibold uppercase tracking-widest transition ${
                          encendido ? 'border border-white/20 text-paper hover:border-paper' : 'bg-volt text-ink hover:brightness-110'
                        }`}
                      >
                        {encendido ? 'Abrir la web' : m.boton}
                      </button>
                    </div>
                    {/* Mensaje propio de este modo (vacío = el de por defecto) */}
                    <label className="mt-4 mb-1 block text-xs uppercase tracking-widest text-muted">
                      Mensaje del aviso (opcional)
                    </label>
                    <textarea
                      value={obras.mensajes?.[m.modo] || ''}
                      onChange={(e) => setObras({ ...obras, mensajes: { ...obras.mensajes, [m.modo]: e.target.value } })}
                      rows={2}
                      placeholder={MENSAJES_OBRAS_POR_DEFECTO[m.modo]}
                      className="w-full rounded-sm border border-white/20 bg-surface2 px-3 py-2 text-sm text-paper focus:border-volt focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => guardarObras(obras.activa)}
                      className="mt-2 text-xs text-muted underline hover:text-paper"
                    >
                      Guardar mensaje
                    </button>
                  </div>
                );
              })}
              {obrasMsg && <p className="mt-3 text-xs text-volt">{obrasMsg}</p>}
            </div>

            {/* DE VACACIONES */}
            <div
              className={`mb-12 rounded-sm border p-6 ${vacaciones.activa ? 'border-volt bg-volt/10' : 'border-white/10 bg-surface'}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-xl tracking-wide text-paper">De vacaciones</h2>
                  <p className="mt-1 text-xs text-muted">
                    {vacaciones.activa
                      ? 'ACTIVADO: en Servicios y Clases sale el aviso y no se puede reservar. La tienda sigue vendiendo.'
                      : 'Desactivado. Al activarlo, la tienda sigue vendiendo y solo se pausan las reservas de servicios y clases.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => guardarVacaciones(!vacaciones.activa)}
                  className={`rounded-sm px-4 py-2 text-xs font-semibold uppercase tracking-widest transition ${
                    vacaciones.activa ? 'border border-white/20 text-paper hover:border-paper' : 'bg-volt text-ink hover:brightness-110'
                  }`}
                >
                  {vacaciones.activa ? 'Ya he vuelto' : 'Irme de vacaciones'}
                </button>
              </div>
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-[180px_1fr]">
                <div>
                  <label className="mb-1 block text-xs uppercase tracking-widest text-muted">Vuelvo el (opcional)</label>
                  <input
                    type="date"
                    value={vacaciones.vuelta}
                    onChange={(e) => setVacaciones({ ...vacaciones, vuelta: e.target.value })}
                    className="w-full rounded-sm border border-white/20 bg-surface2 px-3 py-2 text-sm text-paper focus:border-volt focus:outline-none"
                  />
                  <p className="mt-1 text-[11px] text-muted">Ese día se vuelven a abrir las reservas solas.</p>
                </div>
                <div>
                  <label className="mb-1 block text-xs uppercase tracking-widest text-muted">Mensaje (opcional)</label>
                  <textarea
                    value={vacaciones.mensaje}
                    onChange={(e) => setVacaciones({ ...vacaciones, mensaje: e.target.value })}
                    rows={2}
                    placeholder={MENSAJE_VACACIONES_POR_DEFECTO}
                    className="w-full rounded-sm border border-white/20 bg-surface2 px-3 py-2 text-sm text-paper focus:border-volt focus:outline-none"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => guardarVacaciones(vacaciones.activa)}
                className="mt-2 text-xs text-muted underline hover:text-paper"
              >
                Guardar fecha y mensaje
              </button>
              {vacacionesMsg && <p className="mt-3 text-xs text-volt">{vacacionesMsg}</p>}
            </div>

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

              {/* OFERTA DE LA SUSCRIPCIÓN (solo el primer mes) */}
              <form onSubmit={handleGuardarOfertaSuscripcion} className="mt-6 space-y-4 border-t border-white/10 pt-5">
                <label className="flex items-center gap-2 text-sm text-paper cursor-pointer">
                  <input
                    type="checkbox"
                    checked={subOferta.activa}
                    onChange={(e) => setSubOferta({ ...subOferta, activa: e.target.checked })}
                    className="cursor-pointer"
                  />
                  Oferta por tiempo limitado (solo el primer mes de quien se suscriba durante la oferta)
                </label>
                {subOferta.activa && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs uppercase tracking-widest text-muted">Empieza</label>
                      <input
                        type="datetime-local"
                        value={subOferta.inicio}
                        onChange={(e) => setSubOferta({ ...subOferta, inicio: e.target.value })}
                        className="w-full rounded-sm border border-white/20 bg-surface2 px-3 py-2 text-paper focus:outline-none focus:border-volt [color-scheme:dark]"
                      />
                      <p className="mt-1 text-[11px] text-muted">Vacío = empieza ya al guardar.</p>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs uppercase tracking-widest text-muted">Termina</label>
                      <input
                        type="datetime-local"
                        value={subOferta.fin}
                        onChange={(e) => setSubOferta({ ...subOferta, fin: e.target.value })}
                        className="w-full rounded-sm border border-white/20 bg-surface2 px-3 py-2 text-paper focus:outline-none focus:border-volt [color-scheme:dark]"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs uppercase tracking-widest text-muted">Tipo</label>
                      <select
                        value={subOferta.tipo}
                        onChange={(e) => setSubOferta({ ...subOferta, tipo: e.target.value })}
                        className="w-full rounded-sm border border-white/20 bg-surface2 px-3 py-2 text-paper focus:outline-none focus:border-volt"
                      >
                        <option value="porcentaje">Descuento en %</option>
                        <option value="precio">Precio nuevo (€)</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs uppercase tracking-widest text-muted">
                        {subOferta.tipo === 'porcentaje' ? 'Descuento (%)' : 'Precio del primer mes (€)'}
                      </label>
                      <input
                        type="number"
                        step={subOferta.tipo === 'porcentaje' ? '1' : '0.01'}
                        min="0"
                        value={subOferta.valor}
                        onChange={(e) => setSubOferta({ ...subOferta, valor: e.target.value })}
                        className="w-full rounded-sm border border-white/20 bg-surface2 px-3 py-2 text-paper focus:outline-none focus:border-volt"
                      />
                    </div>
                  </div>
                )}
                <button
                  type="submit"
                  className="rounded-sm border border-volt px-4 py-2 text-xs font-semibold uppercase tracking-widest text-volt hover:bg-volt hover:text-ink"
                >
                  Guardar oferta
                </button>
                {subOfertaMsg && <p className="text-xs text-volt">{subOfertaMsg}</p>}
              </form>
            </div>

            {/* LÍMITE SEMANAL DE COMPRAS */}
            <div className="mb-12 rounded-sm border border-white/10 bg-surface p-6">
              <h2 className="font-display text-xl tracking-wide text-paper mb-1">Límites de compras (semanales y mensual)</h2>
              <p className="mb-4 text-sm text-muted">
                <strong>Por semana</strong> (de lunes a domingo): servicios, clases sueltas y clases de 12 horas.{' '}
                <strong>Por mes natural</strong> (del día 1 al último día del mes): seguimientos.
                Vacío = valor por defecto · 0 = no aceptar compras de ese tipo en ese periodo.
                Los límites cuentan las compras de todos los clientes juntos.
                Una semana con una clase de 12 horas no admite clases sueltas (de 1 o 2 horas), y al revés.
                El seguimiento (marcado como &laquo;Seguimiento&raquo; en su ficha) no gasta plazas semanales ni bloquea las clases.
                Los pedidos gratuitos (0 €) no cuentan.
              </p>
              <form onSubmit={handleSaveLimits} className="flex flex-wrap items-end gap-4">
                <label className="block">
                  <span className="mb-1 block text-xs uppercase tracking-widest text-muted">Servicios / semana</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={limitServicios}
                    onChange={(e) => setLimitServicios(e.target.value)}
                    placeholder={`Por defecto ${limitEstado?.defectos?.servicios ?? 5}`}
                    className="w-44 rounded-sm border border-white/20 bg-surface2 px-4 py-2 text-paper focus:outline-none focus:border-volt"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs uppercase tracking-widest text-muted">Clases sueltas / semana</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={limitCortas}
                    onChange={(e) => setLimitCortas(e.target.value)}
                    placeholder={`Por defecto ${limitEstado?.defectos?.cortas ?? 4}`}
                    className="w-44 rounded-sm border border-white/20 bg-surface2 px-4 py-2 text-paper focus:outline-none focus:border-volt"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs uppercase tracking-widest text-muted">Clases de 12 h / semana</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={limitLargas}
                    onChange={(e) => setLimitLargas(e.target.value)}
                    placeholder={`Por defecto ${limitEstado?.defectos?.largas ?? 1}`}
                    className="w-44 rounded-sm border border-white/20 bg-surface2 px-4 py-2 text-paper focus:outline-none focus:border-volt"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs uppercase tracking-widest text-muted">Seguimientos / mes</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={limitSeguimiento}
                    onChange={(e) => setLimitSeguimiento(e.target.value)}
                    placeholder={`Por defecto ${limitEstado?.defectos?.seguimiento ?? 1}`}
                    className="w-44 rounded-sm border border-white/20 bg-surface2 px-4 py-2 text-paper focus:outline-none focus:border-volt"
                  />
                </label>
                <button
                  type="submit"
                  disabled={limitSaving}
                  className="rounded-sm bg-volt px-4 py-2 text-xs font-semibold uppercase tracking-widest text-ink hover:brightness-110 disabled:opacity-50"
                >
                  {limitSaving ? 'Guardando…' : 'Guardar Límites'}
                </button>
              </form>
              {limitMsg && <p className="mt-3 text-xs text-volt">{limitMsg}</p>}
              {limitEstado?.semana && (
                <p className="mt-3 text-sm text-muted">
                  Esta semana (se renueva el {limitEstado.semana.renovacion}) — Servicios: {resumenLimite(limitEstado.semana.servicios)} · Clases sueltas: {resumenLimite(limitEstado.semana.cortas)} · Clases de 12 h: {resumenLimite(limitEstado.semana.largas)}
                </p>
              )}
              {limitEstado?.mes && (
                <p className="mt-1 text-sm text-muted">
                  Este mes (se renueva el {limitEstado.mes.renovacion}) — Seguimientos: {resumenLimite(limitEstado.mes.seguimiento)}
                </p>
              )}
              {Array.isArray(limitEstado?.clasesSinTipo) && limitEstado.clasesSinTipo.length > 0 && (
                <p className="mt-3 text-xs text-volt">
                  Atención: estas clases no tienen tipo de cupo (suelta / de 12 h / Seguimiento / No cuenta) y por ahora NO están limitadas:{' '}
                  {limitEstado.clasesSinTipo.join(', ')}. Edítalas en &laquo;Clases&raquo; y elige el cupo semanal.
                </p>
              )}
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
                            <th className="px-4 py-3"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {(statsData.stats?.[expandedStat]?.breakdown || []).length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-4 py-3 text-muted">
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
                                <td className="px-4 py-3 text-right">
                                  <button
                                    type="button"
                                    disabled={statsBorrando || !row.purchase_id}
                                    onClick={() =>
                                      borrarCompras(
                                        {
                                          accion: 'linea',
                                          compraId: row.purchase_id,
                                          indice: row.item_index,
                                          tipo: expandedStat,
                                          nombre: row.name,
                                        },
                                        `¿Borrar del todo "${row.name}" (${row.quantity} ud.) de ${row.email}?\n\nDesaparece de las estadísticas y del historial del cliente, y libera su cupo. No se puede deshacer.`
                                      )
                                    }
                                    className="text-xs font-semibold text-red-400 hover:text-red-300 disabled:opacity-40"
                                  >
                                    Borrar
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>

                      {(() => {
                        // Clientes distintos de este bloque (con su user_id, o
                        // "email:..." si compró sin cuenta) y cuántos
                        // artículos tiene cada uno.
                        const filas = statsData.stats?.[expandedStat]?.breakdown || [];
                        const porCliente = new Map();
                        for (const f of filas) {
                          const clave = f.user_id || (f.guest_email ? `email:${f.guest_email}` : null);
                          if (!clave) continue;
                          const c = porCliente.get(clave) || { email: f.email, n: 0 };
                          c.n += 1;
                          porCliente.set(clave, c);
                        }
                        if (porCliente.size === 0) return null;
                        const elegido = porCliente.get(clienteABorrar);
                        const nombreBloque = STAT_BLOCKS.find((b) => b.key === expandedStat)?.label || '';
                        return (
                          <div className="flex flex-wrap items-center gap-3 border-t border-white/10 bg-surface px-4 py-3">
                            <span className="text-xs text-muted">Borrar todas las de un cliente:</span>
                            <select
                              value={clienteABorrar}
                              onChange={(e) => setClienteABorrar(e.target.value)}
                              className="rounded-sm border border-white/20 bg-surface2 px-3 py-2 text-sm text-paper focus:outline-none focus:border-volt"
                            >
                              <option value="">Elige un cliente…</option>
                              {[...porCliente.entries()].map(([id, c]) => (
                                <option key={id} value={id}>
                                  {c.email} ({c.n})
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              disabled={!elegido || statsBorrando}
                              onClick={() =>
                                borrarCompras(
                                  {
                                    accion: 'cliente',
                                    ...(clienteABorrar.startsWith('email:')
                                      ? { email: clienteABorrar.slice(6) }
                                      : { userId: clienteABorrar }),
                                    tipo: expandedStat,
                                    year: statsYear,
                                  },
                                  `¿Borrar del todo ${elegido.n === 1 ? 'la línea' : `las ${elegido.n} líneas`} de "${nombreBloque}" de ${elegido.email} en ${statsYear}?\n\nDesaparecen de las estadísticas y del historial del cliente, y liberan su cupo. No se puede deshacer.`
                                )
                              }
                              className="rounded-sm border border-red-400/60 px-3 py-2 text-xs font-semibold uppercase tracking-widest text-red-400 transition hover:bg-red-400 hover:text-black disabled:opacity-40"
                            >
                              Borrar todas
                            </button>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                  {statsMsg && <p className="mt-3 text-xs text-volt">{statsMsg}</p>}
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

            {/* OPINIONES DE CLIENTES */}
            <div className="mb-12">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-2xl tracking-wide text-paper">Opiniones</h2>
                <Link
                  href="/admin/opiniones"
                  className="rounded-sm bg-volt px-4 py-2 text-xs font-semibold uppercase tracking-widest text-ink hover:brightness-110"
                >
                  Revisar
                </Link>
              </div>
              <div className="rounded-sm border border-white/10 bg-surface p-4 text-sm text-muted">
                Pendientes de aprobar: <span className="font-semibold text-paper">{opinionesPendientes}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminGuard>
  );
}
