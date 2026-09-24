import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

export default function AreaClientePage() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [packs, setPacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subscriptionPrice, setSubscriptionPrice] = useState(7.99);
  const [showSettings, setShowSettings] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function loadData() {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
        return;
      }

      setUser(session.user);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      setProfile(profileData);

      const { data: settingsData } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'subscription_price')
        .maybeSingle();
      
      if (settingsData && settingsData.value) {
        setSubscriptionPrice(settingsData.value);
      }

      if (profileData?.is_subscribed || profileData?.is_admin) {
        const { data: postsData } = await supabase.from('posts').select('*').order('created_at', { ascending: false });
        const { data: packsData } = await supabase.from('packs').select('*').order('created_at', { ascending: false });
        
        setPosts(postsData || []);
        setPacks(packsData || []);
      }

      setLoading(false);
    }

    loadData();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleSubscriptionCheckout = async () => {
    try {
      const priceInCents = Math.round(Number(subscriptionPrice) * 100);

      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isSubscription: true,
          customPriceCents: priceInCents,
          planName: 'Suscripción Área de Clientes',
          userId: user?.id,
        }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('Error al iniciar el pago con Stripe: ' + (data.error || 'Desconocido'));
      }
    } catch (err) {
      console.error('Error de conexión:', err);
      alert('Hubo un error al conectar con el servidor de pagos.');
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('¿Estás seguro de que deseas cancelar tu suscripción? Perderás el acceso al contenido exclusivo.')) {
      return;
    }

    try {
      const response = await fetch('/api/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('Tu suscripción ha sido cancelada con éxito.');
        window.location.reload();
      } else {
        alert('Error al cancelar: ' + (data.error || 'Desconocido'));
      }
    } catch (err) {
      console.error('Error de conexión:', err);
      alert('Hubo un error al conectar con el servidor.');
    }
  };

  // FUNCIÓN CORREGIDA: Forzamos el redirectTo a tu dominio real
  const handleResetPassword = async () => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: 'https://hottieprodthis.com/reset-password',
      });

      if (error) {
        alert('Hubo un error al intentar enviar el correo: ' + error.message);
      } else {
        alert('¡Listo! Te hemos enviado un correo con un enlace seguro para cambiar tu contraseña. Por favor, revisa también tu carpeta de Spam.');
      }
    } catch (err) {
      console.error('Error al solicitar cambio de contraseña:', err);
      alert('Ocurrió un error inesperado de conexión.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-ink text-paper flex items-center justify-center font-body">
        <p className="text-muted">Cargando área privada...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink text-paper relative">
      <Head>
        <title>Área de Clientes — The Lab</title>
      </Head>

      <div className="mx-auto max-w-5xl px-5 py-10">
        
        {/* Botón de volver arriba */}
        <div className="mb-8">
          <Link 
            href="/"
            className="inline-flex items-center gap-2 rounded-sm border border-white/20 px-4 py-2 text-xs uppercase tracking-widest text-paper hover:border-signal hover:text-signal transition"
          >
            <span>&larr;</span> Volver a la web
          </Link>
        </div>

        {/* Cabecera con título y botones */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-white/10 pb-6 mb-10 gap-4">
          <div>
            <h1 className="font-display text-3xl tracking-wide text-paper mb-1">Área de Clientes</h1>
            <p className="text-xs text-muted uppercase tracking-widest">{user?.email}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {profile?.is_admin && (
              <Link 
                href="/admin" 
                className="rounded-sm bg-volt px-4 py-2 text-xs font-semibold uppercase tracking-widest text-ink hover:brightness-110 transition"
              >
                Panel Admin
              </Link>
            )}
            
            {/* Botón de Ajustes */}
            <button 
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-2 rounded-sm border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-paper hover:border-volt hover:text-volt transition"
              title="Ajustes de cuenta"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06-.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
              Ajustes
            </button>

            <button 
              onClick={handleLogout} 
              className="rounded-sm border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-muted hover:text-paper transition"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>

        {/* Verificación de suscripción */}
        {!profile?.is_subscribed && !profile?.is_admin ? (
          <div className="rounded-sm border border-white/10 bg-surface p-8 text-center max-w-lg mx-auto my-12">
            <h2 className="font-display text-2xl mb-3 text-paper">🔒 Contenido Exclusivo Bloqueado</h2>
            <p className="text-sm text-muted mb-6 leading-relaxed">
              Para acceder a todos los packs de descargas y posts exclusivos, activa tu suscripción mensual por solo {subscriptionPrice} €/mes.
            </p>
            <button 
              onClick={handleSubscriptionCheckout} 
              className="rounded-sm bg-volt px-6 py-3 text-xs font-semibold uppercase tracking-widest text-ink hover:brightness-110"
            >
              Suscribirse Ahora ({subscriptionPrice} €/mes)
            </button>
          </div>
        ) : (
          <div className="space-y-12">
            
            {/* Sección Packs */}
            <div>
              <h2 className="font-display text-2xl tracking-wide text-paper mb-6 border-l-4 border-volt pl-3">
                Kits y Packs Exclusivos
              </h2>
              {packs.length === 0 ? (
                <p className="text-sm text-muted">No hay packs publicados todavía.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {packs.map((pack) => (
                    <div key={pack.id} className="rounded-sm border border-white/10 bg-surface p-6 flex flex-col justify-between">
                      <div>
                        <h3 className="font-display text-lg text-paper mb-2">{pack.title}</h3>
                        <p className="text-xs text-muted mb-4">{pack.description || 'Sin descripción'}</p>
                      </div>
                      <a 
                        href="#" 
                        onClick={(e) => { e.preventDefault(); window.open(pack.file_key, '_blank'); }}
                        className="inline-block rounded-sm bg-volt px-4 py-2 text-xs font-semibold uppercase tracking-widest text-ink text-center hover:brightness-110"
                      >
                        Descargar Pack
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sección Posts */}
            <div>
              <h2 className="font-display text-2xl tracking-wide text-paper mb-6 border-l-4 border-volt pl-3">
                Posts y Novedades Exclusivas
              </h2>
              {posts.length === 0 ? (
                <p className="text-sm text-muted">No hay posts publicados todavía.</p>
              ) : (
                <div className="space-y-6">
                  {posts.map((post) => (
                    <article key={post.id} className="rounded-sm border border-white/10 bg-surface p-6">
                      <h3 className="font-display text-xl text-paper mb-3">{post.title}</h3>
                      <div className="text-sm text-paper/90 whitespace-pre-line leading-relaxed">
                        {post.content}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>

            {/* Botón para cancelar la suscripción */}
            <div className="border-t border-white/10 pt-8 text-center">
              <button
                onClick={handleCancelSubscription}
                className="rounded-sm border border-red-500/40 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-red-400 hover:bg-red-500/10 transition"
              >
                Cancelar mi suscripción
              </button>
            </div>

          </div>
        )}

      </div>

      {/* Modal de Ajustes */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-sm border border-white/20 bg-ink p-8 shadow-2xl relative">
            
            <button 
              onClick={() => setShowSettings(false)}
              className="absolute top-4 right-4 text-muted hover:text-white transition"
              title="Cerrar"
            >
              ✕
            </button>
            
            <h3 className="font-display text-2xl tracking-wide text-paper mb-6 border-b border-white/10 pb-4">
              Tus Ajustes
            </h3>
            
            <div className="space-y-6">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted mb-1">Email de la cuenta</p>
                <p className="text-sm text-paper">{user?.email}</p>
              </div>
              
              <div>
                <p className="text-xs uppercase tracking-widest text-muted mb-1">Miembro desde</p>
                <p className="text-sm text-paper">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Fecha desconocida'}
                </p>
              </div>

              <div className="border-t border-white/10 pt-6">
                <p className="text-xs uppercase tracking-widest text-muted mb-2">Seguridad</p>
                <button 
                  onClick={handleResetPassword}
                  className="text-xs text-volt hover:underline"
                >
                  Cambiar mi contraseña
                </button>
                <p className="text-[11px] text-muted mt-2 leading-relaxed">
                  Te enviaremos un correo electrónico con un enlace seguro para que puedas establecer una nueva contraseña.
                </p>
              </div>

              <div className="border-t border-white/10 pt-6">
                <p className="text-xs uppercase tracking-widest text-muted mb-2">Historial de Compras</p>
                <div className="rounded-sm bg-white/5 p-4 text-center">
                  <p className="text-sm text-muted">Aún no hay compras registradas en tu historial.</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
