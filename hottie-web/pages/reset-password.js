import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Escucha si el usuario llega con un token de recuperación válido desde el correo
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY') {
        setIsReady(true);
      }
    });

    // Verificamos por si ya había una sesión activa al cargar
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setIsReady(true);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        setError('Error al actualizar la contraseña: ' + error.message);
      } else {
        setMessage('¡Contraseña actualizada con éxito! Redirigiendo...');
        setTimeout(() => {
          router.push('/area-cliente');
        }, 2000);
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Ocurrió un error inesperado al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ink text-paper flex flex-col items-center justify-center px-5 font-body relative">
      <Head>
        <title>Cambiar Contraseña — The Lab</title>
      </Head>

      <div className="absolute top-10 left-5 md:left-10">
        <Link 
          href="/"
          className="inline-flex items-center gap-2 rounded-sm border border-white/20 px-4 py-2 text-xs uppercase tracking-widest text-paper hover:border-signal hover:text-signal transition"
        >
          <span>&larr;</span> Volver a la web
        </Link>
      </div>

      <div className="w-full max-w-md rounded-sm border border-white/10 bg-surface p-8 shadow-2xl">
        <h1 className="font-display text-3xl tracking-wide text-paper mb-2 text-center">
          Nueva Contraseña
        </h1>
        
        {!isReady ? (
          <p className="text-sm text-volt mb-8 text-center leading-relaxed">
            Verificando tu enlace seguro...
          </p>
        ) : (
          <>
            <p className="text-sm text-muted mb-8 text-center leading-relaxed">
              Escribe a continuación la nueva contraseña que deseas utilizar para tu cuenta.
            </p>

            <form onSubmit={handleUpdatePassword} className="space-y-6">
              <div>
                <label className="block text-xs uppercase tracking-widest text-muted mb-2">
                  Nueva Contraseña
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full rounded-sm border border-white/20 bg-ink px-4 py-3 text-paper focus:border-volt focus:outline-none focus:ring-1 focus:ring-volt transition"
                  required
                />
              </div>

              {error && (
                <div className="rounded-sm bg-red-500/10 border border-red-500/40 p-3 text-sm text-red-400 text-center">
                  {error}
                </div>
              )}
              {message && (
                <div className="rounded-sm bg-volt/10 border border-volt/40 p-3 text-sm text-volt text-center">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !password}
                className="w-full rounded-sm bg-volt px-6 py-3 text-xs font-semibold uppercase tracking-widest text-ink hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Actualizando...' : 'Guardar Contraseña'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
