// Enlaces que mandan los clientes (demos, proyectos, temas para revisar).
//
// Para que abrirlos sea seguro, solo se aceptan enlaces https de plataformas
// conocidas de música y de archivos (Google Drive, Dropbox, WeTransfer,
// SoundCloud...). Así nadie puede colar una página falsa para robar datos,
// un acortador que esconda adónde lleva, una dirección IP o un "javascript:".
// Se comprueba en el navegador (para avisar al cliente al momento) y otra vez
// en el servidor (que es lo que manda).
//
// Lo que NO puede garantizar ningún enlace es el archivo que haya dentro: los
// audios (wav, mp3, aiff, flac) no pueden ejecutar nada, pero nunca abras un
// .exe, .bat, .scr, .js, .apk ni documentos de Office "con macros" que te
// llegue como si fuera música.

const PLATAFORMAS = [
  { nombre: 'Google Drive', dominios: ['drive.google.com', 'docs.google.com'] },
  { nombre: 'Dropbox', dominios: ['dropbox.com', 'www.dropbox.com', 'dl.dropboxusercontent.com'] },
  { nombre: 'WeTransfer', dominios: ['wetransfer.com', 'we.tl'], subdominios: ['wetransfer.com'] },
  { nombre: 'OneDrive', dominios: ['onedrive.live.com', '1drv.ms'], subdominios: ['sharepoint.com'] },
  { nombre: 'iCloud', dominios: ['www.icloud.com', 'icloud.com'] },
  { nombre: 'MEGA', dominios: ['mega.nz', 'mega.io'] },
  { nombre: 'Box', dominios: ['app.box.com', 'box.com'], subdominios: ['app.box.com'] },
  { nombre: 'SoundCloud', dominios: ['soundcloud.com', 'on.soundcloud.com', 'm.soundcloud.com'] },
  { nombre: 'YouTube', dominios: ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be'] },
  { nombre: 'Spotify', dominios: ['open.spotify.com'] },
  { nombre: 'Apple Music', dominios: ['music.apple.com'] },
  { nombre: 'Bandcamp', subdominios: ['bandcamp.com'] },
  { nombre: 'Audiomack', dominios: ['audiomack.com'] },
  { nombre: 'DISCO', subdominios: ['disco.ac'] },
  { nombre: 'untitled', dominios: ['untitled.stream'] },
  { nombre: 'Splice', dominios: ['splice.com'] },
  { nombre: 'BandLab', dominios: ['www.bandlab.com', 'bandlab.com'] },
];

export const NOMBRES_PLATAFORMAS = PLATAFORMAS.map((p) => p.nombre);

function plataformaDe(host) {
  for (const p of PLATAFORMAS) {
    if ((p.dominios || []).includes(host)) return p.nombre;
    if ((p.subdominios || []).some((d) => host === d || host.endsWith(`.${d}`))) return p.nombre;
  }
  return null;
}

// { ok: true, url, plataforma } o { ok: false, motivo }.
export function comprobarEnlace(texto) {
  const crudo = String(texto || '').trim();
  if (!crudo) return { ok: false, motivo: 'Falta el enlace.' };
  if (crudo.length > 600) return { ok: false, motivo: 'El enlace es demasiado largo.' };
  if (/[\s<>"'`]/.test(crudo)) return { ok: false, motivo: 'El enlace tiene espacios o caracteres raros. Pega solo el enlace.' };
  let url;
  try {
    url = new URL(crudo);
  } catch (e) {
    return { ok: false, motivo: 'Eso no parece un enlace. Cópialo entero, empezando por https://' };
  }
  if (url.protocol !== 'https:') return { ok: false, motivo: 'El enlace tiene que empezar por https:// (los que no son seguros no se aceptan).' };
  if (url.username || url.password) return { ok: false, motivo: 'El enlace no puede llevar usuario ni contraseña.' };
  if (url.port) return { ok: false, motivo: 'El enlace no es de una plataforma conocida.' };
  const host = url.hostname.toLowerCase();
  if (host.includes('xn--') || /^[\d.]+$/.test(host) || host.includes(':')) {
    return { ok: false, motivo: 'El enlace no es de una plataforma conocida.' };
  }
  const plataforma = plataformaDe(host);
  if (!plataforma) {
    return {
      ok: false,
      motivo: `Por seguridad solo aceptamos enlaces de: ${NOMBRES_PLATAFORMAS.join(', ')}. Sube tu archivo a una de ellas y pega aquí el enlace.`,
    };
  }
  return { ok: true, url: url.toString(), plataforma };
}

// Varios enlaces, uno por línea (formulario de seguimiento). Devuelve
// { ok, enlaces: [{url, plataforma}], motivo }.
export function comprobarEnlaces(texto, maximo = 10) {
  const lineas = String(texto || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lineas.length === 0) return { ok: false, enlaces: [], motivo: 'Falta al menos un enlace.' };
  if (lineas.length > maximo) return { ok: false, enlaces: [], motivo: `Pon como mucho ${maximo} enlaces.` };
  const enlaces = [];
  for (const linea of lineas) {
    const r = comprobarEnlace(linea);
    if (!r.ok) return { ok: false, enlaces: [], motivo: `«${linea.slice(0, 60)}»: ${r.motivo}` };
    enlaces.push({ url: r.url, plataforma: r.plataforma });
  }
  return { ok: true, enlaces };
}

// Para meter texto del cliente en un correo o página sin que pueda cambiar
// el HTML.
export function escaparHtml(texto) {
  return String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Enlace ya comprobado, listo para un correo: plataforma verificada + enlace.
export function enlaceParaCorreo(r) {
  if (!r?.ok) return 'No adjuntado';
  const url = escaparHtml(r.url);
  return `<span style="color:#10B981;">✓ ${escaparHtml(r.plataforma)} (enlace verificado)</span><br /><a href="${url}" rel="noopener noreferrer nofollow">${url}</a>`;
}

// Para los formularios de briefing: comprueba los enlaces antes de enviar
// (demo opcional y, en el seguimiento, la lista de proyectos). Devuelve el
// texto del problema o null si todo está bien.
export function errorEnlacesBriefing({ demo, proyectos } = {}) {
  if (demo && String(demo).trim()) {
    const r = comprobarEnlace(demo);
    if (!r.ok) return `Enlace de la demo: ${r.motivo}`;
  }
  if (proyectos !== undefined && proyectos !== null) {
    const r = comprobarEnlaces(proyectos);
    if (!r.ok) return `Enlaces de tus proyectos: ${r.motivo}`;
  }
  return null;
}

// Primer mensaje de error de una lista de respuestas de fetch (o null).
export async function primerError(respuestas) {
  const fallo = respuestas.find((x) => !x.ok);
  if (!fallo) return null;
  const datos = await fallo.json().catch(() => ({}));
  return datos.error || 'Hubo un problema al enviar el formulario. Inténtalo de nuevo.';
}
