// Decide cómo mostrar la "URL de preview / demo" de un producto según la web
// del enlace (la usa pages/tienda/[slug].js):
//   - 'iframe': reproductor incrustado (YouTube, Spotify, SoundCloud, Vimeo,
//     Apple Music, Google Drive).
//   - 'audio':  archivo de audio directo (.mp3, .wav…), con el reproductor
//     del navegador.
//   - 'enlace': cualquier otra web, con un botón que la abre en otra pestaña.
// Solo se aceptan enlaces http/https; cualquier otra cosa devuelve null.

const EXT_AUDIO = /\.(mp3|wav|ogg|oga|m4a|aac|flac|opus|weba)$/i;

export function interpretarDemo(texto) {
  let url;
  try {
    url = new URL(String(texto || '').trim());
  } catch (e) {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;

  const host = url.hostname.toLowerCase().replace(/^www\./, '').replace(/^m\./, '');
  const partes = url.pathname.split('/').filter(Boolean);

  // YouTube: watch?v=, youtu.be/, shorts/, embed/, live/ y music.youtube.com
  if (host === 'youtube.com' || host === 'music.youtube.com' || host === 'youtu.be' || host === 'youtube-nocookie.com') {
    let id = '';
    if (host === 'youtu.be') id = partes[0] || '';
    else if (url.searchParams.get('v')) id = url.searchParams.get('v');
    else if (['shorts', 'embed', 'live', 'v'].includes(partes[0])) id = partes[1] || '';
    if (/^[A-Za-z0-9_-]{6,20}$/.test(id)) {
      return { tipo: 'iframe', src: `https://www.youtube.com/embed/${id}`, video: true, nombre: 'YouTube' };
    }
    return { tipo: 'enlace', src: url.href, nombre: 'YouTube' };
  }

  // Spotify: track/album/playlist/artist/episode/show (con o sin "intl-xx")
  if (host === 'open.spotify.com') {
    const p = partes[0] && partes[0].startsWith('intl-') ? partes.slice(1) : partes;
    if (p[0] === 'embed') p.shift();
    const tipos = ['track', 'album', 'playlist', 'artist', 'episode', 'show'];
    if (tipos.includes(p[0]) && /^[A-Za-z0-9]+$/.test(p[1] || '')) {
      const alto = p[0] === 'track' || p[0] === 'episode' ? 152 : 352;
      return { tipo: 'iframe', src: `https://open.spotify.com/embed/${p[0]}/${p[1]}`, alto, nombre: 'Spotify' };
    }
    return { tipo: 'enlace', src: url.href, nombre: 'Spotify' };
  }

  // SoundCloud (sus enlaces cortos on.soundcloud.com no se pueden incrustar)
  if (host === 'soundcloud.com') {
    const limpio = `https://soundcloud.com${url.pathname}`;
    const alto = partes[1] === 'sets' ? 450 : 166;
    return {
      tipo: 'iframe',
      src: `https://w.soundcloud.com/player/?url=${encodeURIComponent(limpio)}&color=%23ccff00&visual=false`,
      alto,
      nombre: 'SoundCloud',
    };
  }

  // Vimeo: vimeo.com/123456
  if (host === 'vimeo.com' && /^\d+$/.test(partes[0] || '')) {
    return { tipo: 'iframe', src: `https://player.vimeo.com/video/${partes[0]}`, video: true, nombre: 'Vimeo' };
  }

  // Apple Music
  if (host === 'music.apple.com') {
    const alto = url.searchParams.get('i') ? 175 : 450;
    return { tipo: 'iframe', src: `https://embed.music.apple.com${url.pathname}${url.search}`, alto, nombre: 'Apple Music' };
  }

  // Google Drive: drive.google.com/file/d/ID/...
  if (host === 'drive.google.com' && partes[0] === 'file' && partes[1] === 'd' && /^[A-Za-z0-9_-]+$/.test(partes[2] || '')) {
    // Puede ser audio o vídeo: se reserva el hueco de un vídeo.
    return { tipo: 'iframe', src: `https://drive.google.com/file/d/${partes[2]}/preview`, video: true, nombre: 'Google Drive' };
  }

  // Archivo de audio directo (también Dropbox: se pide el archivo en bruto)
  if (EXT_AUDIO.test(url.pathname)) {
    if (host === 'dropbox.com') {
      url.searchParams.delete('dl');
      url.searchParams.set('raw', '1');
    }
    return { tipo: 'audio', src: url.href, nombre: 'Audio' };
  }

  // Cualquier otra web: botón para abrirla
  return { tipo: 'enlace', src: url.href, nombre: host };
}
