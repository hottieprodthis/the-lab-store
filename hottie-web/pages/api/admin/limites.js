import { createClient } from '@supabase/supabase-js';
import {
  estadoSemana,
  clasesSinTipo,
  CLAVE_LIMITE_SERVICIOS,
  CLAVE_LIMITE_CORTAS,
  CLAVE_LIMITE_LARGAS,
  LIMITES_POR_DEFECTO,
} from '../../../lib/limiteSemanal';

// Service Role Key: escribe en "settings" y cuenta las compras de todos los
// clientes. Por eso la ruta solo responde a una sesión de admin (misma
// comprobación que pages/api/admin/estadisticas.js).
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function comprobarAdmin(req) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return { status: 401, error: 'No autorizado: falta la sesión de admin.' };

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData?.user) {
    return { status: 401, error: 'No autorizado: la sesión de admin no es válida o ha caducado.' };
  }

  const { data: perfil } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', userData.user.id)
    .single();

  if (!perfil?.is_admin) {
    return { status: 403, error: 'Esta cuenta no tiene permisos de administrador (profiles.is_admin).' };
  }
  return null;
}

// Convierte lo que llega del formulario: vacío -> null (se usa el valor por
// defecto); número entero entre 0 y 9999 -> ese número; cualquier otra cosa
// -> undefined (inválido).
function interpretar(valor) {
  if (valor === null || valor === undefined || String(valor).trim() === '') return null;
  const n = Number(valor);
  if (!Number.isInteger(n) || n < 0 || n > 9999) return undefined;
  return n;
}

async function guardar(clave, valor) {
  if (valor === null) {
    // Sin valor propio = se usa el valor por defecto (sin fila).
    return supabase.from('settings').delete().eq('key', clave);
  }
  return supabase.from('settings').upsert({ key: clave, value: String(valor) }, { onConflict: 'key' });
}

function respuesta(estado) {
  const { limites, guardados, usadas, renovacion, filas } = estado;
  return {
    ok: true,
    guardados, // lo guardado (null = valor por defecto)
    defectos: LIMITES_POR_DEFECTO,
    semana: {
      renovacion,
      servicios: { limit: limites.servicios, used: usadas.servicios },
      cortas: { limit: limites.cortas, used: usadas.cortas },
      largas: { limit: limites.largas, used: usadas.largas },
    },
    clasesSinTipo: clasesSinTipo(filas.clases),
  };
}

// GET  -> límites actuales y lo usado esta semana.
// POST -> { servicios, cortas, largas } guarda los límites (vacío = valor por
//         defecto, 0 = no aceptar compras de ese tipo esa semana).
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const fallo = await comprobarAdmin(req);
    if (fallo) return res.status(fallo.status).json({ error: fallo.error });

    if (req.method === 'POST') {
      const servicios = interpretar(req.body?.servicios);
      const cortas = interpretar(req.body?.cortas);
      const largas = interpretar(req.body?.largas);
      if (servicios === undefined || cortas === undefined || largas === undefined) {
        return res.status(400).json({
          error: 'Los límites tienen que ser números enteros (o dejarlos vacíos para usar el valor por defecto).',
        });
      }

      const pares = [
        [CLAVE_LIMITE_SERVICIOS, servicios, 'servicios'],
        [CLAVE_LIMITE_CORTAS, cortas, 'clases sueltas'],
        [CLAVE_LIMITE_LARGAS, largas, 'clases de 12 horas'],
      ];
      for (const [clave, valor, nombre] of pares) {
        const r = await guardar(clave, valor);
        if (r.error) {
          return res.status(500).json({ error: `No se pudo guardar el límite de ${nombre}: ${r.error.message}` });
        }
      }
    }

    const estado = await estadoSemana(supabase);
    return res.status(200).json(respuesta(estado));
  } catch (err) {
    console.error('Error en /api/admin/limites:', err);
    return res.status(500).json({ error: 'No se pudo procesar la petición de límites.' });
  }
}
