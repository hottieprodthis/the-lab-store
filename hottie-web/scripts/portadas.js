// Antes de cada build (npm run build → "prebuild"): descarga a
// public/portadas/ la portada de cada vídeo de YouTube que sale en la portada
// de la web ("Los más escuchados" y los EP), si todavía no está.
// Así, al añadir una canción nueva basta con poner su id en
// components/MasEscuchados.js: la imagen se guarda sola y los visitantes
// nunca la cargan desde YouTube (que enviaría su IP a Google sin permiso).
const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');
const carpeta = path.join(raiz, 'public', 'portadas');

function idsDeVideos() {
  const ids = new Set();
  const carrusel = fs.readFileSync(path.join(raiz, 'components', 'MasEscuchados.js'), 'utf8');
  for (const m of carrusel.matchAll(/\bid:\s*'([A-Za-z0-9_-]{6,20})'/g)) ids.add(m[1]);
  const portada = fs.readFileSync(path.join(raiz, 'pages', 'index.js'), 'utf8');
  for (const m of portada.matchAll(/portada="([A-Za-z0-9_-]{6,20})"/g)) ids.add(m[1]);
  return [...ids];
}

async function main() {
  fs.mkdirSync(carpeta, { recursive: true });
  for (const id of idsDeVideos()) {
    const destino = path.join(carpeta, `${id}.jpg`);
    if (fs.existsSync(destino)) continue;
    try {
      const res = await fetch(`https://i.ytimg.com/vi/${id}/hqdefault.jpg`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      fs.writeFileSync(destino, Buffer.from(await res.arrayBuffer()));
      console.log(`portadas: descargada ${id}`);
    } catch (e) {
      // No se para el build por una portada: el vídeo sale con fondo oscuro.
      console.warn(`portadas: no se pudo descargar ${id} (${e.message})`);
    }
  }
}

main();
