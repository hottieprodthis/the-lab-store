import { suscripcionActiva, leerCierreArea } from '../../../lib/suscripcion';
import { insigniaAntiguedad, insigniaCompras, INSIGNIA_POR_VIDA } from '../../../lib/insignias';
import {
  supabaseServidor as supabase,
  usuarioDePeticion,
  mesActual,
  cupoRevisiones,
  comprasPagadas,
  leerAjuste,
} from '../../../lib/servidorArea';

// Todo lo "extra" del área de clientes en una sola llamada (pages/area-cliente.js):
//   - insignias del cliente,
//   - bloque "Próximamente" (solo si el admin ha escrito algo),
//   - escaparate: títulos y portadas de lo exclusivo, para quien aún no está
//     suscrito (nunca el contenido ni los enlaces de descarga),
//   - votación abierta (suscriptores),
//   - revisión de temas: cupo del mes y la petición del cliente (suscriptores).
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Método no permitido' });
  }
  res.setHeader('Cache-Control', 'no-store');
  try {
    const usuario = await usuarioDePeticion(req);
    if (!usuario) return res.status(401).json({ error: 'Tienes que iniciar sesión.' });

    const { data: perfil } = await supabase
      .from('profiles')
      .select('is_admin, is_subscribed, subscribed_until, por_vida')
      .eq('id', usuario.id)
      .maybeSingle();
    const suscrito = suscripcionActiva(perfil);
    const mes = mesActual();

    const [compras, proximamente, cierre, packs, posts, cupo, usadasMes] = await Promise.all([
      comprasPagadas(usuario.id),
      leerAjuste('coming_soon'),
      leerAjuste('area_closing'),
      supabase.from('packs').select('title, cover_url', { count: 'exact' }).order('created_at', { ascending: false }).limit(6),
      supabase.from('posts').select('title', { count: 'exact' }).order('created_at', { ascending: false }).limit(4),
      cupoRevisiones(),
      supabase.from('revisiones').select('id', { count: 'exact', head: true }).eq('mes', mes),
    ]);

    const respuesta = {
      suscrito,
      insignias: {
        antiguedad: insigniaAntiguedad(usuario.created_at),
        compras: insigniaCompras(compras),
        porVida: perfil?.por_vida ? INSIGNIA_POR_VIDA : null,
      },
      proximamente: String(proximamente || '').trim() || null,
      cierre: leerCierreArea(cierre),
      escaparate: suscrito
        ? null
        : {
            packs: (packs.data || []).map((p) => ({ title: p.title, cover_url: p.cover_url || null })),
            posts: (posts.data || []).map((p) => ({ title: p.title })),
            totalPacks: packs.count || 0,
            totalPosts: posts.count || 0,
          },
      revision: { mes, cupo, usadas: usadasMes.count || 0 },
      votacion: null,
    };

    if (suscrito) {
      const { data: votacion } = await supabase
        .from('votaciones')
        .select('id, pregunta, opciones')
        .eq('abierta', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (votacion) {
        const { data: votos } = await supabase.from('votos').select('user_id, opcion').eq('votacion_id', votacion.id);
        const mio = (votos || []).find((v) => v.user_id === usuario.id);
        const opciones = Array.isArray(votacion.opciones) ? votacion.opciones : [];
        respuesta.votacion = {
          id: votacion.id,
          pregunta: votacion.pregunta,
          opciones,
          miVoto: mio ? mio.opcion : null,
          // Los resultados solo se ven después de votar.
          resultados: mio ? opciones.map((_, i) => (votos || []).filter((v) => v.opcion === i).length) : null,
        };
      }

      const { data: mias } = await supabase
        .from('revisiones')
        .select('id, mes, titulo, artista, plataforma, estado, respuesta, respondida_en, created_at')
        .eq('user_id', usuario.id)
        .order('created_at', { ascending: false })
        .limit(4);
      respuesta.revision.mia = (mias || []).find((r) => r.mes === mes) || null;
      respuesta.revision.anteriores = (mias || []).filter((r) => r.mes !== mes && r.estado === 'respondida').slice(0, 3);
    }

    return res.status(200).json(respuesta);
  } catch (e) {
    console.error('api/area/extras:', e);
    return res.status(500).json({ error: 'No se pudo cargar tu área.' });
  }
}
