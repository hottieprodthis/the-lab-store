import { suscripcionActiva } from '../../../lib/suscripcion';
import { CALIDADES } from '../../../lib/revisiones';
import { comprobarEnlace, enlaceParaCorreo, escaparHtml } from '../../../lib/enlacesSeguros';
import {
  supabaseServidor as supabase,
  usuarioDePeticion,
  mesActual,
  nombreMes,
  cupoRevisiones,
  enviarCorreo,
  CORREO_ADMIN,
} from '../../../lib/servidorArea';

// Petición de revisión de un tema (área de clientes, solo suscriptores):
// 1 al mes por persona y un cupo total al mes para todos (30 por defecto,
// se cambia en el panel). El cupo se comprueba dentro de la base de datos
// (función pedir_revision) para que nunca se pase aunque lleguen a la vez.
// POST { enlace, titulo, artista, genero, bpm, tonalidad, calidad, nota }

const corto = (v, max) => String(v ?? '').trim().slice(0, max);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido' });
  }
  try {
    const usuario = await usuarioDePeticion(req);
    if (!usuario) return res.status(401).json({ error: 'Tienes que iniciar sesión.' });
    const { data: perfil } = await supabase
      .from('profiles')
      .select('is_admin, is_subscribed, subscribed_until')
      .eq('id', usuario.id)
      .maybeSingle();
    if (!suscripcionActiva(perfil)) return res.status(403).json({ error: 'Las revisiones son para suscriptores.' });

    const b = req.body || {};
    const enlace = comprobarEnlace(b.enlace);
    if (!enlace.ok) return res.status(400).json({ error: enlace.motivo });
    const datos = {
      titulo: corto(b.titulo, 120),
      artista: corto(b.artista, 120),
      genero: corto(b.genero, 80),
      bpm: corto(b.bpm, 10),
      tonalidad: corto(b.tonalidad, 20),
      calidad: CALIDADES.includes(b.calidad) ? b.calidad : '',
      nota: corto(b.nota, 400),
    };
    if (!datos.titulo || !datos.artista || !datos.calidad) {
      return res.status(400).json({ error: 'Faltan el título, el artista o la calidad del archivo.' });
    }

    const mes = mesActual();
    const { data: resultado, error } = await supabase.rpc('pedir_revision', {
      p_user: usuario.id,
      p_email: usuario.email,
      p_mes: mes,
      p_cupo: await cupoRevisiones(),
      p_enlace: enlace.url,
      p_plataforma: enlace.plataforma,
      p_titulo: datos.titulo,
      p_artista: datos.artista,
      p_genero: datos.genero,
      p_bpm: datos.bpm,
      p_tonalidad: datos.tonalidad,
      p_calidad: datos.calidad,
      p_nota: datos.nota,
    });
    if (error) throw error;
    if (resultado === 'ya') return res.status(409).json({ error: 'Ya nos mandaste tu tema de este mes. ¡El mes que viene puedes mandar otro!', motivo: 'ya' });
    if (resultado === 'lleno') return res.status(409).json({ error: 'cupo', motivo: 'lleno' });

    const e = escaparHtml;
    await enviarCorreo({
      from: 'The Lab System <pedidos@hottieprodthis.com>',
      to: [CORREO_ADMIN],
      subject: `🎧 Nueva revisión de tema: ${datos.titulo} — ${datos.artista}`,
      html: `
        <h2>Nueva petición de revisión (${e(nombreMes(mes))})</h2>
        <p><strong>Cliente:</strong> ${e(usuario.email)}</p>
        <p><strong>Tema:</strong> ${e(datos.titulo)} — ${e(datos.artista)}</p>
        <p><strong>Género:</strong> ${e(datos.genero || '—')} · <strong>BPM:</strong> ${e(datos.bpm || '—')} · <strong>Tonalidad:</strong> ${e(datos.tonalidad || '—')}</p>
        <p><strong>Calidad del archivo:</strong> ${e(datos.calidad)}</p>
        <p><strong>Enlace:</strong><br />${enlaceParaCorreo(enlace)}</p>
        ${datos.nota ? `<p><strong>Nota del cliente:</strong><br />${e(datos.nota).replace(/\n/g, '<br />')}</p>` : ''}
        <p>Respóndela desde el panel: Admin → Revisiones de temas.</p>
      `,
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('api/area/revision:', err);
    return res.status(500).json({ error: 'No se pudo enviar tu tema. Inténtalo de nuevo en un rato.' });
  }
}
