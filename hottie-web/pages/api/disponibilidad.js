import { createClient } from '@supabase/supabase-js';
import {
  estadoSemana,
  calcularDisponibilidad,
  resumirPedido,
  comprobarPedido,
} from '../../lib/limiteSemanal';

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
  renovacion: '',
};

// GET  -> si quedan plazas esta semana de servicios y de clases (2 h y 12 h)
//         y por qué no, si no quedan. Lo usan las fichas, los listados y el
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

  try {
    const estado = await estadoSemana(supabase);

    if (req.method === 'GET') {
      const d = calcularDisponibilidad(estado);
      return res.status(200).json({
        servicios: { disponible: d.servicios.disponible, motivo: d.servicios.motivo },
        clases: {
          corta: { disponible: d.clases.corta.disponible, motivo: d.clases.corta.motivo },
          larga: { disponible: d.clases.larga.disponible, motivo: d.clases.larga.motivo },
        },
        renovacion: d.renovacion,
      });
    }

    const resumen = await resumirPedido(supabase, req.body?.items);
    return res.status(200).json(comprobarPedido(estado, resumen));
  } catch (err) {
    console.error('Error en /api/disponibilidad:', err);
    if (req.method === 'GET') return res.status(200).json(TODO_DISPONIBLE);
    return res.status(200).json({ ok: true, message: '' });
  }
}
