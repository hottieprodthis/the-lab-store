import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabaseAdmin as supabase } from '../lib/supabaseAdminClient';

export default function AdminGuard({ children }) {
  const router = useRouter();
  const [status, setStatus] = useState('checking'); // checking | ok | denied

  useEffect(() => {
    let mounted = true;

    // Hace falta una sesión Y que la cuenta sea admin (profiles.is_admin).
    // Antes bastaba con cualquier sesión iniciada.
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      if (!data.session) {
        setStatus('denied');
        router.replace('/admin/login');
        return;
      }
      const { data: perfil } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', data.session.user.id)
        .maybeSingle();
      if (!mounted) return;
      if (perfil?.is_admin) {
        setStatus('ok');
      } else {
        setStatus('denied');
        await supabase.auth.signOut();
        router.replace('/admin/login');
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setStatus('denied');
        router.replace('/admin/login');
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [router]);

  if (status !== 'ok') {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted">
        Comprobando sesión…
      </div>
    );
  }

  return children;
}
