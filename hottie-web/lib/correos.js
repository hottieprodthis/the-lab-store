// Versión en texto normal de un correo HTML. Los correos legítimos suelen
// llevar las dos versiones; sin la de texto, Gmail desconfía más (spam).
export function htmlATexto(html) {
  return String(html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<head[\s\S]*?<\/head>/gi, '')
    .replace(/<a\s[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, texto) => {
      const limpio = texto.replace(/<[^>]+>/g, '').trim();
      return limpio ? `${limpio}: ${href}` : href;
    })
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|tr|table)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .split('\n')
    .map((linea) => linea.replace(/\s+/g, ' ').trim())
    .filter((linea, i, todas) => linea || (todas[i - 1] && todas[i - 1].trim()))
    .join('\n')
    .trim();
}

// Completa un correo antes de enviarlo a Resend: versión de texto (si no la
// tiene) y dirección de respuesta (para que "Responder" llegue a The Lab).
export function prepararCorreo(correo) {
  return {
    ...correo,
    ...(correo.text || !correo.html ? {} : { text: htmlATexto(correo.html) }),
    ...(correo.reply_to ? {} : { reply_to: 'pedidos.thelab@gmail.com' }),
  };
}

// Envío de correos con Resend, uno por destinatario.
//
// Para correos a varias personas (avisos, novedades) NO se pone a todos en el
// mismo "Para:", porque cada uno vería los emails de los demás. Se usa el
// envío por lotes de Resend: un correo independiente por persona, de 100 en
// 100. Devuelve cuántos se han enviado.
export async function enviarCorreosIndividuales(correos) {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) throw new Error('Falta RESEND_API_KEY en Vercel');

  let enviados = 0;
  for (let i = 0; i < correos.length; i += 100) {
    const lote = correos.slice(i, i + 100).map(prepararCorreo);
    const r = await fetch('https://api.resend.com/emails/batch', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(lote),
    });
    if (!r.ok) {
      const detalle = await r.text().catch(() => '');
      throw new Error(`Resend rechazó el envío (${r.status}): ${detalle.slice(0, 200)}`);
    }
    enviados += lote.length;
  }
  return enviados;
}
