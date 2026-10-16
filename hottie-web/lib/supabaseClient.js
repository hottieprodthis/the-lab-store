import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Un único cliente compartido por toda la app (navegador).
// Usa la clave "anon": solo puede leer productos/servicios activos,
// a menos que el usuario haya iniciado sesión como admin (ver /admin/login).
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
