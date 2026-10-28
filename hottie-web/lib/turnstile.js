// Cloudflare Turnstile: comprobación anti-bots invisible para las personas.
//
// Se activa sola cuando en Vercel existen las dos claves:
//   NEXT_PUBLIC_TURNSTILE_SITE_KEY  (pública, la usa el navegador)
//   TURNSTILE_SECRET_KEY            (secreta, solo el servidor)
// Sin ellas, el formulario funciona igual que antes (honeypot + doble
// confirmación por correo).

// Solo con las DOS claves: si faltara la pública, el formulario no tendría
// casilla y nadie podría apuntarse.
export function turnstileActivo() {
  return Boolean(process.env.TURNSTILE_SECRET_KEY && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
}

// true si la comprobación es correcta (o si Turnstile no está configurado).
// Si Cloudflare no responde, se deja pasar: el resto de protecciones siguen.
export async function verificarTurnstile(token, ip) {
  const secreto = process.env.TURNSTILE_SECRET_KEY;
  if (!turnstileActivo()) return true;
  if (!token) return false;
  try {
    const cuerpo = new URLSearchParams({ secret: secreto, response: String(token) });
    if (ip) cuerpo.set('remoteip', String(ip));
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: cuerpo,
    });
    const datos = await r.json();
    return Boolean(datos?.success);
  } catch (e) {
    console.error('Turnstile: no se pudo comprobar', e.message);
    return true;
  }
}
