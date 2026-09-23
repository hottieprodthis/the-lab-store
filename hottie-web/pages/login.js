import { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  const handleAuth = async (e) => {
    e.preventDefault();
    setMessage('');

    if (isSignUp) {
      const { error } = await supabase.auth.signUp(
        { email, password },
        {
          emailRedirectTo: `${window.location.origin}/area-cliente`,
        }
      );
      if (error) setMessage(`Error en registro: ${error.message}`);
      else setMessage('¡Registro exitoso! Revisa tu correo o inicia sesión.');
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage(`Error al iniciar sesión: ${error.message}`);
      else {
        router.push('/area-cliente');
      }
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f0f0f', color: '#fff', fontFamily: 'sans-serif' }}>
      <div style={{ background: '#1a1a1a', padding: '40px', borderRadius: '12px', width: '100%', maxWidth: '400px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <h1 style={{ fontSize: '24px', marginBottom: '20px', textAlign: 'center', fontFamily: 'monospace', letterSpacing: '1px' }}>
          {isSignUp ? 'Crear Cuenta — The Lab' : 'Acceso Clientes — The Lab'}
        </h1>

        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ padding: '12px', borderRadius: '6px', border: '1px solid #333', background: '#262626', color: '#fff', outline: 'none' }}
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ padding: '12px', borderRadius: '6px', border: '1px solid #333', background: '#262626', color: '#fff', outline: 'none' }}
          />
          <button
            type="submit"
            style={{ padding: '12px', borderRadius: '6px', border: 'none', background: '#ccff00', color: '#0f0f0f', fontWeight: 'bold', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '12px' }}
          >
            {isSignUp ? 'Registrarse' : 'Iniciar Sesión'}
          </button>
        </form>

        <p style={{ marginTop: '20px', textAlign: 'center', fontSize: '14px', color: '#aaa' }}>
          {isSignUp ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?'} {' '}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            style={{ background: 'none', border: 'none', color: '#ccff00', cursor: 'pointer', fontWeight: 'bold' }}
          >
            {isSignUp ? 'Inicia sesión aquí' : 'Regístrate aquí'}
          </button>
        </p>

        {message && <p style={{ marginTop: '15px', textAlign: 'center', color: '#ccff00', fontSize: '14px' }}>{message}</p>}
      </div>
    </div>
  );
}
