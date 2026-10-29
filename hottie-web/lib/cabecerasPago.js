import { supabaseAdmin } from './supabaseAdminClient';
import { supabase } from './supabaseClient';

// Cabeceras para las peticiones de pago (/api/checkout y la comprobación
// previa de PayPal en /api/disponibilidad). Con la web cerrada (lib/obras.js):
//  - si está abierta la sesión del panel de admin, se manda su token
//    (x-admin-token) para que el admin pueda pagar y hacer pruebas;
//  - si hay un cliente con sesión, se manda la suya (Authorization), para el
//    acceso anticipado de los suscriptores.
export async function cabecerasPago() {
  const cabeceras = { 'Content-Type': 'application/json' };
  try {
    const { data } = await supabaseAdmin.auth.getSession();
    if (data?.session?.access_token) cabeceras['x-admin-token'] = data.session.access_token;
  } catch (e) {
    // sin sesión de admin: cabeceras normales
  }
  try {
    const { data } = await supabase.auth.getSession();
    if (data?.session?.access_token) cabeceras.Authorization = `Bearer ${data.session.access_token}`;
  } catch (e) {
    // sin sesión de cliente
  }
  return cabeceras;
}
