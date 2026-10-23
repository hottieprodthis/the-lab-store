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
    const lote = correos.slice(i, i + 100);
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
