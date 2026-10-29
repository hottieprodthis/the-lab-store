import { createClient } from '@supabase/supabase-js';
import {
  estadoSemana,
  calcularDisponibilidad,
  resumirPedido,
  comprobarPedido,
} from '../../lib/limiteSemanal';
import { bloqueoPagoObras, leerVacaciones, mensajeReservasVacaciones } from '../../lib/obras';

// Service Role Key: hace falta para contar las compras de TODOS los
// clientes (la tabla purchases solo deja leer sus propias filas a cada
// cliente). Esta ruta solo devuelve si hay plazas o no, nunca datos de
// clientes.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const TODO_DISPONIBLE = {
  servicios: { disponible: true, motivo: '' },
  clases: {
    corta: { disponible: true, motivo: '' },
    larga: { disponible: true, motivo: '' },
  },
  seguimiento: { disponible: true, motivo: '' },
  renovacion: '',
};

// GET  -> si quedan plazas esta semana de servicios y de clases (sueltas y de
//         12 h), y este mes de seguimiento, y por qué no, si no quedan. Lo usan las fichas, los listados y el
//         carrito para desactivar botones y avisar.
// POST -> { items: [{ tipo, id, name, quantity }] }: comprueba si ese pedido
//         cabe en lo que queda de semana. Lo llaman los botones de PayPal
//         ANTES de abrir el cobro (después ya no se podría rechazar).
//
// Si algo falla al comprobar, NO se bloquea la venta: es preferible vender
// de más una vez que dejar la tienda sin poder cobrar.
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  // Con la web en obras o las compras cerradas no se deja abrir ningún cobro
  // de PayPal (salvo al admin, para hacer pruebas, y la renovación de la
  // suscripción de quien ya era cliente: { suscripcion: true, userId }).
  if (req.method === 'POST') {
    const cerrada = await bloqueoPagoObras(supabase, req, {
      esSuscripcion: req.body?.suscripcion === true,
      userId: req.body?.userId || null,
    });
    if (cerrada) return res.status(200).json({ ok: false, message: cerrada });
  }

  // De vacaciones: servicios y clases sin plazas (los botones se desactivan
  // con este motivo) y PayPal no deja reservarlos. Los productos, normal.
  const vac = await leerVacaciones(supabase);
  if (vac) {
    const motivo = mensajeReservasVacaciones(vac);
    if (req.method === 'POST') {
      const items = Array.isArray(req.body?.items) ? req.body.items : [];
      if (items.some((i) => i && (i.tipo === 'servicio' || i.tipo === 'clase'))) {
        return res.status(200).json({ ok: false, message: motivo });
      }
      return res.status(200).json({ ok: true, message: '' });
    }
    const cerrado = { disponible: false, motivo, remaining: 0, limit: 0 };
    return res.status(200).json({
      servicios: cerrado,
      clases: { corta: cerrado, larga: cerrado },
      seguimiento: cerrado,
      renovacion: '',
      vacaciones: motivo, // también bloquea los de cupo "libre" (bloqueoPara)
    });
  }

  try {
    const estado = await estadoSemana(supabase);

    if (req.method === 'GET') {
      const d = calcularDisponibilidad(estado);
      return res.status(200).json({
        // "remaining" = plazas que quedan y "limit" = máximo del periodo (el
        // carrito los usa para no dejar acumular más unidades de las que caben
        // y para explicar la regla).
        servicios: {
          disponible: d.servicios.disponible,
          motivo: d.servicios.motivo,
          remaining: d.servicios.remaining,
          limit: d.servicios.limit,
        },
        clases: {
          corta: {
            disponible: d.clases.corta.disponible,
            motivo: d.clases.corta.motivo,
            remaining: d.clases.corta.remaining,
            limit: d.clases.corta.limit,
          },
          larga: {
            disponible: d.clases.larga.disponible,
            motivo: d.clases.larga.motivo,
            remaining: d.clases.larga.remaining,
            limit: d.clases.larga.limit,
          },
        },
        seguimiento: {
          disponible: d.seguimiento.disponible,
          motivo: d.seguimiento.motivo,
          remaining: d.seguimiento.remaining,
          limit: d.seguimiento.limit,
        },
        renovacion: d.renovacion,
      });
    }

    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (items.length === 0) return res.status(200).json({ ok: true, message: '' });

    const resumen = await resumirPedido(supabase, items);
    return res.status(200).json(comprobarPedido(estado, resumen));
  } catch (err) {
    console.error('Error en /api/disponibilidad:', err);
    if (req.method === 'GET') return res.status(200).json(TODO_DISPONIBLE);
    return res.status(200).json({ ok: true, message: '' });
  }
}
