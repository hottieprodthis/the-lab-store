import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Cliente de Supabase EXCLUSIVO para el panel /admin. Usa la misma URL y
// clave "anon" que lib/supabaseClient.js, pero con una "storageKey" propia
// para que la sesión de admin se guarde por separado en el navegador.
//
// Antes, tanto el panel de admin como el área de clientes usaban el mismo
// cliente de Supabase (lib/supabaseClient.js), así que en realidad era
// UNA sola sesión de inicio de sesión compartida: cerrar sesión en el área
// de clientes cerraba también la del admin (y viceversa), porque técnicamente
// era el mismo login guardado en el mismo sitio del navegador. Con una
// "storageKey" distinta, cada sesión vive en su propio espacio y son
// totalmente independientes: cerrar una no afecta a la otra.
export const supabaseAdmin = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'thelab-admin-auth',
  },
});
