import { supabase } from '../../lib/supabaseClient';

export default async function handler(req, res) {
  // Verificar autorización simple para llamadas automáticas
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método no permitido' });
  }

  try {
    // 1. Recibir los datos del producto o servicio recién creado
    const producto = req.body.record || req.body;
    const { title, name, description, price, type } = producto;

    const nombreProducto = title || name || 'Nuevo Lanzamiento';
    const esServicio = type === 'servicio';
    const enlace = esServicio 
      ? 'https://hottieprodthis.com/servicios' 
      : 'https://hottieprodthis.com/tienda';

    // 2. Obtener la lista completa de correos de suscriptores
    const { data: suscriptores, error } = await supabase
      .from('suscriptores')
      .select('email');

    if (error || !suscriptores || suscriptores.length === 0) {
      return res.status(200).json({ message: 'Sin suscriptores a los que notificar' });
    }

    const listaEmails = suscriptores.map((s) => s.email);

    // 3. Enviar el correo masivo con Resend
    const resendApiKey = process.env.RESEND_API_KEY;

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'The Lab <pedidos@hottieprodthis.com>',
        to: listaEmails,
        subject: `🔥 NUEVO ${esServicio ? 'SERVICIO' : 'PRODUCTO'} DISPONIBLE: ${nombreProducto}`,
        html: `
          <div style="background-color:#0d0d0d; color:#ffffff; font-family: Arial, sans-serif; padding:30px; text-align:center;">
            <p style="color:#CCFF00; font-weight:bold; letter-spacing:2px; font-size:12px; margin-bottom:10px;">THE LAB — NOTIFICACIONES</p>
            <h1 style="color:#ffffff; margin-top:0;">¡NUEVO LANZAMIENTO!</h1>
            <h2 style="color:#CCFF00; font-size:24px;">${nombreProducto}</h2>
            ${description ? `<p style="color:#cccccc; font-size:15px; max-w:500px; margin:20px auto;">${description}</p>` : ''}
            ${price ? `<p style="font-size:22px; font-weight:bold; color:#ffffff; margin:15px 0;">Precio: ${price}€</p>` : ''}
            <div style="margin-top:30px;">
              <!-- Botón en formato tabla para garantizar compatibilidad con modo oscuro -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td align="center" bgcolor="#CCFF00" style="border-radius:4px;">
                    <a href="${enlace}" target="_blank" style="padding:14px 28px; font-size:14px; color:#000000; font-weight:bold; text-decoration:none; display:inline-block; text-transform:uppercase;">
                      VER EN LA WEB
                    </a>
                  </td>
                </tr>
              </table>
            </div>
          </div>
        `,
      }),
    });

    return res.status(200).json({ success: true, notificados: listaEmails.length });
  } catch (err) {
    console.error('Error en webhook de nuevo producto:', err);
    return res.status(500).json({ error: err.message });
  }
}
