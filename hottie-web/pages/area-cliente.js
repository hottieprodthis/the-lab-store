import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/router';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
    return <div style={{ background: '#0f0f0f', color: '#fff', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>Cargando área privada...</div>;
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f0f0f', color: '#fff', padding: '40px 20px', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        
        {/* Cabecera */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333', paddingBottom: '20px', marginBottom: '30px' }}>
          <div>
            <h1 style={{ fontSize: '28px', margin: '0 0 5px 0' }}>The Lab - Área de Clientes</h1>
            <p style={{ color: '#aaa', margin: 0 }}>{user?.email}</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            {profile?.is_admin && (
              <button onClick={() => router.push('/admin')} style={{ padding: '10px 16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                Panel Admin
              </button>
            )}
            <button onClick={handleLogout} style={{ padding: '10px 16px', background: '#333', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
              Cerrar Sesión
            </button>
          </div>
        </div>

        {/* Verificación de suscripción */}
        {!profile?.is_subscribed && !profile?.is_admin ? (
          <div style={{ background: '#1a1a1a', padding: '40px', borderRadius: '12px', textAlign: 'center', border: '1px solid #333' }}>
            <h2 style={{ fontSize: '22px', marginBottom: '15px' }}>🔒 Contenido Exclusivo Bloqueado</h2>
            <p style={{ color: '#aaa', marginBottom: '25px', maxWidth: '500px', margin: '0 auto 25px auto' }}>
              Para acceder a todos los Packs de descargas y Posts exclusivos, suscríbete por solo 7,99 €/mes.
            </p>
            <button 
              onClick={() => alert('Próximamente enlace directo de Stripe Checkout')} 
              style={{ padding: '14px 28px', background: '#e50914', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              Suscribirse Ahora (7,99 €/mes)
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
            
            {/* Seccion Packs */}
            <div>
              <h2 style={{ fontSize: '22px', marginBottom: '20px', borderLeft: '4px solid #e50914', paddingLeft: '10px' }}>Kits / Packs Exclusivos</h2>
              {packs.length === 0 ? (
                <p style={{ color: '#666' }}>No hay packs publicados todavía.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' }}>
                  {packs.map((pack) => (
                    <div key={pack.id} style={{ background: '#1a1a1a', borderRadius: '8px', padding: '20px', border: '1px solid #333' }}>
                      <h3 style={{ margin: '0 0 10px 0', fontSize: '18px' }}>{pack.title}</h3>
                      <p style={{ color: '#aaa', fontSize: '14px', marginBottom: '15px' }}>{pack.description}</p>
                      <a 
                        href={`#`} 
                        style={{ display: 'inline-block', padding: '8px 14px', background: '#e50914', color: '#fff', borderRadius: '4px', textDecoration: 'none', fontSize: '14px', fontWeight: 'bold' }}
                      >
                        Descargar Pack
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Seccion Posts */}
            <div>
              <h2 style={{ fontSize: '22px', marginBottom: '20px', borderLeft: '4px solid #3b82f6', paddingLeft: '10px' }}>Posts y Novedades Exclusivas</h2>
              {posts.length === 0 ? (
                <p style={{ color: '#666' }}>No hay posts publicados todavía.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {posts.map((post) => (
                    <div key={post.id} style={{ background: '#1a1a1a', borderRadius: '8px', padding: '20px', border: '1px solid #333' }}>
                      <h3 style={{ margin: '0 0 10px 0', fontSize: '18px' }}>{post.title}</h3>
                      <p style={{ color: '#ccc', fontSize: '15px', lineHeight: '1.5', margin: 0 }}>{post.content}</p>
                    </div>
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
