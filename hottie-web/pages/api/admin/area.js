import { suscripcionActiva, cierreAnunciado, DIAS_AVISO_CIERRE } from '../../../lib/suscripcion';
import { enviarCorreosIndividuales } from '../../../lib/correos';
import { insigniaAntiguedad, insigniaCompras, INSIGNIA_POR_VIDA } from '../../../lib/insignias';
import { comprobarEnlace, escaparHtml } from '../../../lib/enlacesSeguros';
import {
  supabaseServidor as supabase,
  adminDePeticion,
  mesActual,
  nombreMes,
  cupoRevisiones,
  enviarCorreo,
} from '../../../lib/servidorArea';

// Panel de admin de los extras del área de clientes (solo cuenta admin):
//   GET  ?seccion=votaciones | revisiones&mes=AAAA-MM | clientes
//   POST { accion: 'crearVotacion', pregunta, opciones[] }
//        { accion: 'cerrarVotacion' | 'borrarVotacion', id }
//        { accion: 'responderRevision', id, respuesta }
//        { accion: 'avisarCierre', fecha } | { accion: 'anularCierre' }
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const admin = await adminDePeticion(req);
    if (!admin) return res.status(403).json({ error: 'Solo para la cuenta de admin.' });

    if (req.method === 'GET') {
      const seccion = req.query.seccion;
      if (seccion === 'votaciones') return res.status(200).json(await listarVotaciones());
      if (seccion === 'revisiones') return res.status(200).json(await listarRevisiones(String(req.query.mes || mesActual())));
      if (seccion === 'clientes') return res.status(200).json(await listarClientes());
      return res.status(400).json({ error: 'Sección desconocida.' });
    }
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'GET, POST');
      return res.status(405).json({ error: 'Método no permitido' });
    }

    const b = req.body || {};
    if (b.accion === 'crearVotacion') {
      const pregunta = String(b.pregunta || '').trim().slice(0, 200);
      const opciones = (Array.isArray(b.opciones) ? b.opciones : [])
        .map((o) => String(o || '').trim().slice(0, 120))
        .filter(Boolean)
        .slice(0, 8);
      if (!pregunta || opciones.length < 2) return res.status(400).json({ error: 'Escribe la pregunta y al menos 2 opciones.' });
      // Solo una abierta a la vez: la anterior se cierra.
      await supabase.from('votaciones').update({ abierta: false, cerrada_en: new Date().toISOString() }).eq('abierta', true);
      const { error } = await supabase.from('votaciones').insert({ pregunta, opciones });
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }
    if (b.accion === 'cerrarVotacion') {
      const { error } = await supabase.from('votaciones').update({ abierta: false, cerrada_en: new Date().toISOString() }).eq('id', String(b.id));
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }
    if (b.accion === 'borrarVotacion') {
      const { error } = await supabase.from('votaciones').delete().eq('id', String(b.id));
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }
    if (b.accion === 'avisarCierre') return res.status(200).json(await avisarCierre(b.fecha));
    if (b.accion === 'anularCierre') {
      const { error } = await supabase.from('settings').upsert({ key: 'area_closing', value: '' }, { onConflict: 'key' });
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }
    if (b.accion === 'responderRevision') {
      const respuesta = String(b.respuesta || '').trim().slice(0, 3000);
      if (!respuesta) return res.status(400).json({ error: 'Escribe tus puntos antes de enviar.' });
      const { data: revision, error } = await supabase
        .from('revisiones')
        .update({ respuesta, estado: 'respondida', respondida_en: new Date().toISOString() })
        .eq('id', String(b.id))
        .select('email, titulo, artista')
        .single();
      if (error) throw error;
      let avisado = false;
      if (revision?.email) {
        const e = escaparHtml;
        const puntos = respuesta
          .split(/\r?\n/)
          .map((l) => l.replace(/^[-•*·\s]+/, '').trim())
          .filter(Boolean)
          .map((l) => `<li style="margin-bottom:8px;">${e(l)}</li>`)
          .join('');
        avisado = await enviarCorreo({
          from: 'The Lab <pedidos@hottieprodthis.com>',
          reply_to: 'pedidos.thelab@gmail.com',
          to: [revision.email],
          subject: `Tu revisión de «${revision.titulo}» ya está lista 🎧`,
          html: `
            <div style="background-color:#0d0d0d; color:#ffffff; font-family: Arial, sans-serif; padding:30px;">
              <p style="color:#CCFF00; font-weight:bold; letter-spacing:2px; font-size:12px;">THE LAB — REVISIÓN DE TU TEMA</p>
              <h2 style="color:#ffffff;">${e(revision.titulo)} — ${e(revision.artista)}</h2>
              <p style="color:#dddddd;">Hottie ha escuchado tu tema. Estos son sus puntos, para que los apuntes:</p>
              <ul style="color:#ffffff; padding-left:20px;">${puntos}</ul>
              <p style="color:#999999; font-size:12px;">También los tienes guardados en tu área de clientes.</p>
              <div style="margin-top:24px;">
                <a href="https://hottieprodthis.com/area-cliente" style="background-color:#CCFF00; color:#000000; padding:14px 28px; text-decoration:none; font-weight:900; border-radius:4px; display:inline-block; text-transform:uppercase;">Ir a mi área de clientes</a>
              </div>
            </div>
          `,
        });
      }
      return res.status(200).json({ ok: true, avisado });
    }
    return res.status(400).json({ error: 'Acción desconocida.' });
  } catch (e) {
    console.error('api/admin/area:', e);
    return res.status(500).json({ error: e.message || 'Error del servidor' });
  }
}

async function listarVotaciones() {
  const { data: votaciones } = await supabase
    .from('votaciones')
    .select('id, pregunta, opciones, abierta, created_at, cerrada_en')
    .order('created_at', { ascending: false })
    .limit(20);
  const ids = (votaciones || []).map((v) => v.id);
  const { data: votos } = ids.length ? await supabase.from('votos').select('votacion_id, opcion').in('votacion_id', ids) : { data: [] };
  return {
    votaciones: (votaciones || []).map((v) => {
      const suyos = (votos || []).filter((x) => x.votacion_id === v.id);
      return {
        ...v,
        total: suyos.length,
        resultados: (Array.isArray(v.opciones) ? v.opciones : []).map((_, i) => suyos.filter((x) => x.opcion === i).length),
      };
    }),
  };
}

async function listarRevisiones(mes) {
  const { data } = await supabase
    .from('revisiones')
    .select('*')
    .eq('mes', mes)
    .order('created_at', { ascending: true });
  return {
    mes,
    nombreMes: nombreMes(mes),
    cupo: await cupoRevisiones(),
    revisiones: (data || []).map((r) => {
      // Se vuelve a comprobar el enlace al enseñarlo (por si la lista de
      // plataformas cambia): el panel solo lo deja abrir si sigue siendo seguro.
      const c = comprobarEnlace(r.enlace);
      return { ...r, enlaceSeguro: c.ok ? c.url : null, plataforma: c.ok ? c.plataforma : r.plataforma };
    }),
  };
}

async function listarClientes() {
  const usuarios = [];
  for (let pagina = 1; pagina <= 10; pagina += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page: pagina, perPage: 1000 });
    if (error) throw error;
    usuarios.push(...(data?.users || []));
    if (!data?.users || data.users.length < 1000) break;
  }
  const { data: perfiles } = await supabase
    .from('profiles')
    .select('id, is_admin, is_subscribed, subscribed_until, stripe_subscription_id, por_vida, por_vida_desde');
  const { data: compras } = await supabase
    .from('purchases')
    .select('user_id')
    .gt('amount', 0)
    .not('plan_name', 'ilike', 'Suscripci%')
    .not('user_id', 'is', null);
  const cuenta = {};
  (compras || []).forEach((c) => {
    cuenta[c.user_id] = (cuenta[c.user_id] || 0) + 1;
  });
  const porId = Object.fromEntries((perfiles || []).map((p) => [p.id, p]));

  const clientes = usuarios
    .map((u) => {
      const p = porId[u.id] || {};
      const n = cuenta[u.id] || 0;
      let suscripcion = 'Sin suscripción';
      if (p.is_admin) suscripcion = 'Admin';
      else if (p.por_vida) suscripcion = 'De por vida';
      else if (suscripcionActiva(p)) suscripcion = p.stripe_subscription_id ? 'Mensual (tarjeta)' : 'Mensual (PayPal)';
      return {
        id: u.id,
        email: u.email,
        desde: u.created_at,
        compras: n,
        suscripcion,
        insignias: {
          antiguedad: insigniaAntiguedad(u.created_at),
          compras: insigniaCompras(n),
          porVida: p.por_vida ? INSIGNIA_POR_VIDA : null,
        },
      };
    })
    .sort((a, b) => b.compras - a.compras || new Date(a.desde) - new Date(b.desde));
  return { clientes };
}

// Aviso de cierre del área de clientes: se guarda la fecha y se manda un
// correo a cada suscriptor activo (de por vida y mensuales). La fecha tiene
// que ser al menos 60 días después de hoy (condiciones de venta).
async function avisarCierre(fechaTexto) {
  if (await cierreAnunciado(supabase)) throw new Error('Ya hay un cierre anunciado. Anúlalo antes de anunciar otro.');
  const minimo = new Date(Date.now() + DIAS_AVISO_CIERRE * 86400000);
  const cierre = fechaTexto ? new Date(fechaTexto) : minimo;
  if (Number.isNaN(cierre.getTime()) || cierre.getTime() < minimo.getTime() - 3600000) {
    throw new Error(`La fecha de cierre tiene que ser al menos ${DIAS_AVISO_CIERRE} días después de hoy.`);
  }
  const { error } = await supabase
    .from('settings')
    .upsert({ key: 'area_closing', value: JSON.stringify({ aviso: new Date().toISOString(), cierre: cierre.toISOString() }) }, { onConflict: 'key' });
  if (error) throw error;

  const { data: perfiles } = await supabase
    .from('profiles')
    .select('email, is_admin, is_subscribed, subscribed_until, por_vida')
    .eq('is_subscribed', true)
    .gt('subscribed_until', new Date().toISOString());
  const destinatarios = (perfiles || []).filter((p) => p.email && !p.is_admin && suscripcionActiva(p));
  const fecha = cierre.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Madrid' });
  const correos = destinatarios.map((p) => ({
    from: 'The Lab <pedidos@hottieprodthis.com>',
    reply_to: 'pedidos.thelab@gmail.com',
    to: [p.email],
    subject: `Aviso importante: el área de clientes de The Lab cerrará el ${fecha}`,
    html: `
      <div style="background-color:#0d0d0d; color:#ffffff; font-family: Arial, sans-serif; padding:30px;">
        <p style="color:#CCFF00; font-weight:bold; letter-spacing:2px; font-size:12px;">THE LAB — ÁREA DE CLIENTES</p>
        <h2 style="color:#ffffff;">El área de clientes cerrará el ${fecha}</h2>
        <p style="color:#dddddd;">Te avisamos con tiempo, como dicen nuestras condiciones de venta. Hasta esa fecha sigues teniendo acceso a todo el contenido exclusivo, así que aprovecha para <strong>descargar los kits y packs</strong> que quieras conservar.</p>
        ${p.por_vida ? '' : '<p style="color:#dddddd;">Si pagas la suscripción mensual con tarjeta, puedes cancelarla cuando quieras desde tu área para que no se renueve.</p>'}
        <p style="color:#dddddd;">Gracias de corazón por apoyar The Lab.</p>
        <div style="margin-top:24px;">
          <a href="https://hottieprodthis.com/area-cliente" style="background-color:#CCFF00; color:#000000; padding:14px 28px; text-decoration:none; font-weight:900; border-radius:4px; display:inline-block; text-transform:uppercase;">Ir a mi área de clientes</a>
        </div>
      </div>
    `,
  }));
  let avisados = 0;
  let errorCorreo = null;
  if (correos.length) {
    try {
      avisados = await enviarCorreosIndividuales(correos);
    } catch (e) {
      errorCorreo = e.message;
    }
  }
  return { ok: true, cierre: cierre.toISOString(), suscriptores: destinatarios.length, avisados, errorCorreo };
}
