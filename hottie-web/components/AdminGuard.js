import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function AdminGuard({ children }) {
  const router = useRouter();
  const [status, setStatus] = useState('checking'); // checking | ok | denied

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (data.session) {
        setStatus('ok');
      } else {
        setStatus('denied');
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
