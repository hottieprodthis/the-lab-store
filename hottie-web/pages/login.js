import { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

// Los errores de Supabase llegan en inglés: los más habituales, en español.
function traducirError(mensaje = '') {
  const m = mensaje.toLowerCase();
  if (m.includes('invalid login credentials')) return 'El correo o la contraseña no son correctos.';
  if (m.includes('already registered') || m.includes('already been registered')) return 'Ya hay una cuenta con ese correo. Inicia sesión.';
  if (m.includes('email not confirmed')) return 'Antes de entrar, confirma tu correo con el enlace que te hemos enviado.';
  if (m.includes('password') && m.includes('characters')) return 'La contraseña tiene que tener al menos 6 caracteres.';
  if (m.includes('rate limit') || m.includes('too many')) return 'Demasiados intentos seguidos. Espera un minuto y vuelve a probar.';
  if (m.includes('valid email') || m.includes('invalid email')) return 'Ese correo no parece válido. Revísalo.';
  return 'No se ha podido completar. Inténtalo de nuevo y, si sigue pasando, escríbenos.';
}

const estiloCampo = {
  padding: '12px',
  borderRadius: '6px',
  border: '1px solid #333',
  background: '#262626',
  color: '#fff',
  width: '100%',
  boxSizing: 'border-box',
};
const estiloEtiqueta = { display: 'block', marginBottom: '6px', fontSize: '13px', color: '#ccc' };
const estiloAyuda = { marginTop: '6px', fontSize: '12px', color: '#71717a' };

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verClave, setVerClave] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState('');
  const [esError, setEsError] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const router = useRouter();

  const avisar = (texto, error = false) => {
    setMessage(texto);
    setEsError(error);
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    avisar('');
    setEnviando(true);

    if (isSignUp) {
      const { error } = await supabase.auth.signUp(
        { email, password },
        {
          emailRedirectTo: `${window.location.origin}/area-cliente`,
        }
      );
      if (error) avisar(traducirError(error.message), true);
      else avisar('¡Cuenta creada! Revisa tu correo para confirmarla y después inicia sesión.');
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) avisar(traducirError(error.message), true);
      else {
        router.push('/area-cliente');
        return;
      }
    }
    setEnviando(false);
  };

  // Enlace para poner una contraseña nueva (pages/reset-password.js).
  const olvideClave = async () => {
    if (!email) {
      avisar('Escribe tu correo arriba y vuelve a pulsar «¿Has olvidado tu contraseña?».', true);
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) avisar(traducirError(error.message), true);
    else avisar('Si hay una cuenta con ese correo, te hemos enviado un enlace para poner una contraseña nueva.');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f0f0f', color: '#fff', fontFamily: 'sans-serif', padding: '16px' }}>
      <div style={{ background: '#1a1a1a', padding: '40px', borderRadius: '12px', width: '100%', maxWidth: '400px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', boxSizing: 'border-box' }}>
        <h1 style={{ fontSize: '24px', marginBottom: '20px', textAlign: 'center', fontFamily: 'monospace', letterSpacing: '1px' }}>
          {isSignUp ? 'Crear Cuenta — The Lab' : 'Acceso Clientes — The Lab'}
        </h1>

        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label htmlFor="correo" style={estiloEtiqueta}>
              Correo electrónico
            </label>
            <input
              id="correo"
              type="email"
              autoComplete="email"
              placeholder="tu@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="focus:border-volt focus:outline-none"
              style={estiloCampo}
            />
          </div>
          <div>
            <label htmlFor="clave" style={estiloEtiqueta}>
              Contraseña
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="clave"
                type={verClave ? 'text' : 'password'}
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                minLength={isSignUp ? 6 : undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="focus:border-volt focus:outline-none"
                style={{ ...estiloCampo, paddingRight: '72px' }}
              />
              <button
                type="button"
                onClick={() => setVerClave(!verClave)}
                aria-label={verClave ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer', fontSize: '12px' }}
              >
                {verClave ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
            {isSignUp ? (
              <p style={estiloAyuda}>Mínimo 6 caracteres.</p>
            ) : (
              <button
                type="button"
                onClick={olvideClave}
                style={{ marginTop: '8px', background: 'none', border: 'none', padding: 0, color: '#a1a1aa', cursor: 'pointer', fontSize: '12px', textDecoration: 'underline' }}
              >
                ¿Has olvidado tu contraseña?
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={enviando}
            style={{ padding: '12px', borderRadius: '6px', border: 'none', background: '#ccff00', color: '#0f0f0f', fontWeight: 'bold', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '12px', opacity: enviando ? 0.6 : 1 }}
          >
            {enviando ? 'Un momento…' : isSignUp ? 'Registrarse' : 'Iniciar Sesión'}
          </button>
        </form>

        <p style={{ marginTop: '20px', textAlign: 'center', fontSize: '14px', color: '#aaa' }}>
          {isSignUp ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?'} {' '}
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              avisar('');
            }}
            style={{ background: 'none', border: 'none', color: '#ccff00', cursor: 'pointer', fontWeight: 'bold' }}
          >
            {isSignUp ? 'Inicia sesión aquí' : 'Regístrate aquí'}
          </button>
        </p>

        {message && (
          <p role={esError ? 'alert' : 'status'} style={{ marginTop: '15px', textAlign: 'center', color: esError ? '#fca5a5' : '#ccff00', fontSize: '14px' }}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

// Con la web en obras o en "solo portada y contacto" (panel) esta página se
// tapa con el aviso de obras (lib/obras.js).
export async function getServerSideProps({ res }) {
  const { supabase } = await import('../lib/supabaseClient');
  const { propsSegunObras } = await import('../lib/obras');
  return propsSegunObras(supabase, res, 'general');
}
