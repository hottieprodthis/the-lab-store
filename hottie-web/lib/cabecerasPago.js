import { supabaseAdmin } from './supabaseAdminClient';

// Cabeceras para las peticiones de pago (/api/checkout y la comprobación
// previa de PayPal en /api/disponibilidad). Si en este navegador está abierta
// la sesión del panel de admin, se manda su token: con la web "solo portada y
// contacto" (lib/obras.js) el admin puede seguir pagando para hacer pruebas.
export async function cabecerasPago() {
  const cabeceras = { 'Content-Type': 'application/json' };
  try {
    const { data } = await supabaseAdmin.auth.getSession();
    if (data?.session?.access_token) cabeceras['x-admin-token'] = data.session.access_token;
  } catch (e) {
    // sin sesión de admin: cabeceras normales
  }
  return cabeceras;
}
