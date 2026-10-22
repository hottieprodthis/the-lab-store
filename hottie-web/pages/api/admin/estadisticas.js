import { createClient } from '@supabase/supabase-js';

// Usamos la Service Role Key porque necesitamos leer el email real de cada
// cliente con auth.admin.getUserById (igual que ya hacen
// notificar-contenido-exclusivo.js y notificar-nuevo-producto.js): la tabla
// "profiles" no guarda el email, solo el id.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Calcula, para un año concreto, cuántas clases se han impartido y cuántos
// servicios/productos se han vendido (sumando las cantidades de cada línea
// de purchases.items, no solo el número de pedidos), junto con el desglose
// de qué cliente ha pagado cada artículo. Lo usa el panel de admin
// (pages/admin/index.js) para los 3 bloques de estadísticas anuales.
//
// Nota: solo se cuentan las compras que tienen "items" guardado con su tipo
// (producto/servicio/clase) — esto es así desde el cambio que añadió
// cart_data a pages/api/checkout.js. Las suscripciones del área de clientes
// (que guardan items: null) y algún pedido muy antiguo de antes de ese
// cambio no entran en este recuento porque no tienen un tipo fiable.
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    // Esta ruta devuelve emails de clientes, así que solo responde a una
    // sesión iniciada cuyo perfil tenga is_admin = true (el mismo campo que
    // ya usa el área de clientes para mostrar el botón "Panel Admin"). El
    // panel manda el token de la sesión de admin en la cabecera
    // Authorization; sin él, o con una cuenta que no sea admin, no se
    // devuelve nada.
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

    const yearParam = parseInt(req.query.year, 10);
    const year = Number.isInteger(yearParam) ? yearParam : new Date().getFullYear();

    // El año se mide en hora de España: el 1 de enero siempre es horario de
    // invierno (UTC+01:00), así que el año empieza a las 00:00 de allí. Con
    // "Z" (UTC) una compra hecha entre las 00:00 y la 01:00 del 1 de enero
    // se habría contado en el año anterior.
    const desde = new Date(`${year}-01-01T00:00:00+01:00`).toISOString();
    const hasta = new Date(`${year + 1}-01-01T00:00:00+01:00`).toISOString();

    // Supabase devuelve como máximo 1000 filas por consulta; se lee por
    // páginas para que, si algún año hay más de 1000 compras, los números
    // no salgan recortados en silencio.
    const compras = [];
    const TAMANO_PAGINA = 1000;
    for (let inicio = 0; ; inicio += TAMANO_PAGINA) {
      const { data: pagina, error } = await supabase
        .from('purchases')
        .select('id, user_id, items, created_at')
        .gte('created_at', desde)
        .lt('created_at', hasta)
        .order('created_at', { ascending: false })
        .order('id', { ascending: true })
        .range(inicio, inicio + TAMANO_PAGINA - 1);

      if (error) {
        return res.status(500).json({ error: error.message });
      }
      compras.push(...(pagina || []));
      if (!pagina || pagina.length < TAMANO_PAGINA) break;
    }

    // Resolvemos el email de cada cliente UNA sola vez por user_id (no una
    // vez por línea de artículo ni por compra), para no multiplicar las
    // llamadas a auth.admin.getUserById si un mismo cliente ha comprado
    // varias veces en el año.
    const userIds = [...new Set((compras || []).map((c) => c.user_id).filter(Boolean))];
    const emailPorUserId = {};
    for (const uid of userIds) {
      try {
        const { data } = await supabase.auth.admin.getUserById(uid);
        emailPorUserId[uid] = data?.user?.email || 'Email no disponible';
      } catch (e) {
        emailPorUserId[uid] = 'Email no disponible';
      }
    }

    const stats = {
      servicio: { count: 0, breakdown: [] },
      clase: { count: 0, breakdown: [] },
      producto: { count: 0, breakdown: [] },
    };

    for (const compra of compras || []) {
      if (!Array.isArray(compra.items)) continue; // suscripciones o pedidos muy antiguos sin desglose
      const email = emailPorUserId[compra.user_id] || 'Email no disponible';

      for (const [indice, articulo] of compra.items.entries()) {
        const tipo = articulo?.type;
        if (tipo !== 'servicio' && tipo !== 'clase' && tipo !== 'producto') continue;

        const cantidad = Number(articulo.quantity) || 1;
        stats[tipo].count += cantidad;
        stats[tipo].breakdown.push({
          // Para poder borrar esta línea desde el panel (ver
          // /api/admin/borrar-compras): qué compra es, qué cliente y en qué
          // posición de la compra está el artículo.
          purchase_id: compra.id,
          user_id: compra.user_id || null,
          item_index: indice,
          email,
          name: articulo.name || 'Artículo',
          quantity: cantidad,
          price_cents: typeof articulo.price_cents === 'number' ? articulo.price_cents : null,
          currency: articulo.currency || 'eur',
          created_at: compra.created_at,
        });
      }
    }

    return res.status(200).json({ year, stats });
  } catch (err) {
    console.error('Error en /api/admin/estadisticas:', err);
    return res.status(500).json({ error: 'No se pudieron calcular las estadísticas' });
  }
}
