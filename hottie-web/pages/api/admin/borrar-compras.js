import { createClient } from '@supabase/supabase-js';

// Borra compras del historial (tabla "purchases") desde el panel de admin.
// El borrado es DEFINITIVO: la compra desaparece de las estadísticas, del
// historial del cliente en el área de clientes y deja de gastar cupo
// semanal/mensual. No se puede deshacer.
//
// Dos formas de uso (POST, siempre con la sesión de admin):
//   { accion: 'linea',   compraId, indice, tipo, nombre }
//        -> quita UN artículo de una compra (la línea que ves en el
//           desglose). Si era el único artículo, se borra la compra entera.
//   { accion: 'cliente', userId, tipo, year }
//   { accion: 'cliente', email, tipo, year }   (comprador sin cuenta)
//        -> quita TODOS los artículos de ese tipo (servicio/clase/producto)
//           que ese cliente compró en ese año.
//
// En compras con varios artículos solo se quita lo que se pide: el resto de
// la compra se queda, y su importe y su nombre se recalculan.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const TIPOS = ['servicio', 'clase', 'producto'];

// Importe (en euros) de la línea de un artículo, según lo que guarda el
// historial (price_cents * cantidad).
function importeLinea(articulo) {
  const cents = typeof articulo?.price_cents === 'number' ? articulo.price_cents : 0;
  const cantidad = Number(articulo?.quantity) || 1;
  return (cents * cantidad) / 100;
}

// Quita de una compra los artículos indicados. Devuelve 'borrada' si la compra
// se ha eliminado entera, 'actualizada' si se ha quedado con el resto.
async function quitarArticulos(compra, indicesAQuitar) {
  const items = Array.isArray(compra.items) ? compra.items : [];
  const quitar = new Set(indicesAQuitar);
  const quedan = items.filter((_, i) => !quitar.has(i));

  if (quedan.length === 0) {
    const { error } = await supabase.from('purchases').delete().eq('id', compra.id);
    if (error) throw new Error(error.message);
    return 'borrada';
  }

  const importeQuitado = items.reduce((acc, a, i) => (quitar.has(i) ? acc + importeLinea(a) : acc), 0);
  const importeActual = Number(compra.amount);
  const cambios = { items: quedan };
  if (Number.isFinite(importeActual)) {
    cambios.amount = Math.max(0, Math.round((importeActual - importeQuitado) * 100) / 100);
  }
  // El nombre que se ve en el historial del cliente ("A + B") se rehace con
  // lo que queda, solo si todos los artículos tienen nombre.
  if (quedan.every((a) => typeof a?.name === 'string' && a.name.trim())) {
    cambios.plan_name = quedan.map((a) => a.name.trim()).join(' + ');
  }

  const { error } = await supabase.from('purchases').update(cambios).eq('id', compra.id);
  if (error) throw new Error(error.message);
  return 'actualizada';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    // Solo cuentas con profiles.is_admin = true (mismo control que
    // /api/admin/estadisticas y /api/admin/limites).
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return res.status(401).json({ error: 'No autorizado: falta la sesión de admin.' });
    }

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return res.status(401).json({ error: 'No autorizado: la sesión de admin no es válida o ha caducado.' });
    }

    const { data: perfil } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', userData.user.id)
      .single();

    if (!perfil?.is_admin) {
      return res.status(403).json({ error: 'Esta cuenta no tiene permisos de administrador (profiles.is_admin).' });
    }

    const { accion, tipo } = req.body || {};
    if (!TIPOS.includes(tipo)) {
      return res.status(400).json({ error: 'Tipo de artículo no válido.' });
    }

    // ---------------------------------------------------------------- línea
    if (accion === 'linea') {
      const { compraId, indice, nombre } = req.body;
      if (typeof compraId !== 'string' || !compraId || !Number.isInteger(indice) || indice < 0) {
        return res.status(400).json({ error: 'Faltan datos de la compra a borrar.' });
      }

      const { data: compra, error } = await supabase
        .from('purchases')
        .select('id, user_id, amount, plan_name, items')
        .eq('id', compraId)
        .single();
      if (error || !compra) {
        return res.status(404).json({ error: 'Esa compra ya no existe. Recarga las estadísticas.' });
      }

      // Seguridad ante listas desactualizadas: el artículo que hay en esa
      // posición tiene que ser el mismo que el admin tiene delante.
      const articulo = Array.isArray(compra.items) ? compra.items[indice] : null;
      if (!articulo || articulo.type !== tipo || (articulo.name || 'Artículo') !== nombre) {
        return res.status(409).json({ error: 'La lista ha cambiado. Recarga las estadísticas e inténtalo de nuevo.' });
      }

      const resultado = await quitarArticulos(compra, [indice]);
      return res.status(200).json({ ok: true, articulos: 1, compras: 1, resultado });
    }

    // -------------------------------------------------------------- cliente
    if (accion === 'cliente') {
      // Cliente con cuenta -> userId. Comprador sin cuenta -> email (las
      // compras que tienen user_id vacío y ese email).
      const { userId, email, year } = req.body;
      const conCuenta = typeof userId === 'string' && userId;
      const sinCuenta = !conCuenta && typeof email === 'string' && email;
      if ((!conCuenta && !sinCuenta) || !Number.isInteger(year) || year < 2000 || year > 2100) {
        return res.status(400).json({ error: 'Faltan datos del cliente o del año.' });
      }

      // Mismo año (hora de España) que usa /api/admin/estadisticas.
      const desde = new Date(`${year}-01-01T00:00:00+01:00`).toISOString();
      const hasta = new Date(`${year + 1}-01-01T00:00:00+01:00`).toISOString();

      const compras = [];
      const TAMANO_PAGINA = 1000;
      for (let inicio = 0; ; inicio += TAMANO_PAGINA) {
        let consulta = supabase
          .from('purchases')
          .select('id, user_id, amount, plan_name, items, created_at');
        consulta = conCuenta ? consulta.eq('user_id', userId) : consulta.is('user_id', null).eq('email', email);
        const { data: pagina, error } = await consulta
          .gte('created_at', desde)
          .lt('created_at', hasta)
          .order('created_at', { ascending: false })
          .order('id', { ascending: true })
          .range(inicio, inicio + TAMANO_PAGINA - 1);
        if (error) return res.status(500).json({ error: error.message });
        compras.push(...(pagina || []));
        if (!pagina || pagina.length < TAMANO_PAGINA) break;
      }

      let articulos = 0;
      let comprasTocadas = 0;
      for (const compra of compras) {
        if (!Array.isArray(compra.items)) continue;
        const indices = [];
        compra.items.forEach((a, i) => {
          if (a?.type === tipo) indices.push(i);
        });
        if (indices.length === 0) continue;
        await quitarArticulos(compra, indices);
        articulos += indices.length;
        comprasTocadas += 1;
      }

      return res.status(200).json({ ok: true, articulos, compras: comprasTocadas });
    }

    return res.status(400).json({ error: 'Acción no válida.' });
  } catch (err) {
    console.error('Error en /api/admin/borrar-compras:', err);
    return res.status(500).json({ error: 'No se pudo borrar. Inténtalo de nuevo.' });
  }
}
