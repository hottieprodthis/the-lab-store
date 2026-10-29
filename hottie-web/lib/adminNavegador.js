import { supabaseAdmin } from './supabaseAdminClient';

// ¿Tiene este navegador abierta la sesión del panel de admin? (para que, con
// la web en obras, el admin siga viendo el catálogo y el buscador).
export async function esAdminEnNavegador() {
  try {
    const { data } = await supabaseAdmin.auth.getSession();
    if (!data?.session) return false;
    const { data: perfil } = await supabaseAdmin
      .from('profiles')
      .select('is_admin')
      .eq('id', data.session.user.id)
      .maybeSingle();
    return Boolean(perfil?.is_admin);
  } catch (e) {
    return false;
  }
}
