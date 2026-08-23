import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function AdminHeader({ title }) {
  const router = useRouter();

  async function logout() {
    await supabase.auth.signOut();
    router.push('/admin/login');
  }

  return (
    <header className="border-b border-white/10 bg-surface">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="font-display text-2xl tracking-wide text-paper">
            PANEL
          </Link>
          {title && <span className="text-sm text-muted">/ {title}</span>}
        </div>
        <div className="flex items-center gap-4">
          <Link href="/" target="_blank" className="text-xs uppercase tracking-widest text-signal hover:underline">
            Ver web ↗
          </Link>
          <button
            onClick={logout}
            className="text-xs uppercase tracking-widest text-muted hover:text-volt"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </header>
  );
}
