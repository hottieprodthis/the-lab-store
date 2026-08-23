import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { supabase } from '../../lib/supabaseClient';

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (signInError) {
      setError('Correo o contraseña incorrectos.');
      return;
    }
    router.push('/admin');
  }

  return (
    <>
      <Head>
        <title>Acceso — Panel</title>
      </Head>
      <div className="flex min-h-screen items-center justify-center px-5">
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-5 rounded-sm border border-white/10 bg-surface p-8">
          <h1 className="font-display text-3xl tracking-wide text-paper">Panel de The Lab</h1>

          {error && <p className="rounded-sm bg-volt/10 p-3 text-sm text-volt">{error}</p>}

          <div>
            <label className="mb-1 block text-xs uppercase tracking-widest text-muted">Correo</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-sm border border-white/15 bg-ink px-3 py-2 text-paper outline-none focus:border-signal"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs uppercase tracking-widest text-muted">Contraseña</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-sm border border-white/15 bg-ink px-3 py-2 text-paper outline-none focus:border-signal"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-sm bg-volt px-4 py-3 text-sm font-semibold uppercase tracking-widest text-ink transition hover:brightness-110 disabled:opacity-50"
          >
            {loading ? 'Entrando…' : 'Entrar'}
          </button>

          <p className="text-xs text-muted">
            ¿Primera vez? Crea tu usuario admin en Supabase → Authentication → Users → Add user.
            Ese correo y contraseña son los que usas aquí.
          </p>
        </form>
      </div>
    </>
  );
}
