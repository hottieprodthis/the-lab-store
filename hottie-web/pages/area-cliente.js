import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';
import AdminHeader from '../components/AdminHeader'; // O tu cabecera pública si prefieres

export default function AreaClientePage() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [packs, setPacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function loadData() {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
        return;
      }

      setUser(session.user);

      // Cargar perfil (para ver si está suscrito o es admin)
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      setProfile(profileData);

      // Si está suscrito o es admin, cargamos el contenido exclusivo
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

  if (loading) {
    return (
      <div className="min-h-screen bg-ink text-paper flex items-center justify-center font-body">
        <p className="text-muted">Cargando área privada...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink text-paper">
      <Head>
        <title>Área de Clientes — The Lab</title>
      </Head>

      <div className="mx-auto max-w-5xl px-5 py-10">
        
        {/* Cabecera */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-white/10 pb-6 mb-10 gap-4">
          <div>
            <h1 className="font-display text-3xl tracking-wide text-paper mb-1">Área de Clientes</h1>
            <p className="text-xs text-muted uppercase tracking-widest">{user?.email}</p>
          </div>
          <div className="flex items-center gap-3">
            {profile?.is_admin && (
              <Link 
                href="/admin" 
                className="rounded-sm bg-volt px-4 py-2 text-xs font-semibold uppercase tracking-widest text-ink hover:brightness-110"
              >
                Panel Admin
              </Link>
            )}
            <button 
              onClick={handleLogout} 
              className="rounded-sm border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-muted hover:text-paper"
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
              Para acceder a todos los packs de descargas y posts exclusivos, activa tu suscripción mensual por solo 7,99 €/mes.
            </p>
            <button 
              onClick={() => alert('Próximamente enlace directo de Stripe Checkout')} 
              className="rounded-sm bg-volt px-6 py-3 text-xs font-semibold uppercase tracking-widest text-ink hover:brightness-110"
            >
              Suscribirse Ahora (7,99 €/mes)
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
                        onClick={(e) => { e.preventDefault(); alert(`Descargando: ${pack.file_key}`); }}
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

          </div>
        )}

      </div>
    </div>
  );
}
