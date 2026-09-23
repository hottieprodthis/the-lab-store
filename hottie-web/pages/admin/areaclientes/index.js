import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/router';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AdminAreaClientesIndex() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [price, setPrice] = useState('7.99');
  const [posts, setPosts] = useState([]);
  const [packs, setPacks] = useState([]);
  const [message, setMessage] = useState('');
  const router = useRouter();

  useEffect(() => {
    async function checkAdmin() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', session.user.id)
        .single();

      if (!profile?.is_admin) {
        router.push('/area-cliente');
        return;
      }

      setIsAdmin(true);

      // Cargar precio, posts y packs
      const { data: settingData } = await supabase.from('settings').select('value').eq('key', 'subscription_price').single();
      if (settingData) setPrice(settingData.value);

      const { data: postsData } = await supabase.from('posts').select('*').order('created_at', { ascending: false });
      const { data: packsData } = await supabase.from('packs').select('*').order('created_at', { ascending: false });

      setPosts(postsData || []);
      setPacks(packsData || []);
      setLoading(false);
    }

    checkAdmin();
  }, [router]);

  const handleUpdatePrice = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('settings').update({ value: price }).eq('key', 'subscription_price');
    if (error) setMessage(`Error: ${error.message}`);
    else setMessage('¡Precio de suscripción actualizado con éxito!');
  };

  const handleDeletePost = async (id) => {
    if (!confirm('¿Seguro que quieres borrar este post?')) return;
    await supabase.from('posts').delete().eq('id', id);
    setPosts(posts.filter(p => p.id !== id));
  };

  const handleDeletePack = async (id) => {
    if (!confirm('¿Seguro que quieres borrar este pack?')) return;
    await supabase.from('packs').delete().eq('id', id);
    setPacks(packs.filter(p => p.id !== id));
  };

  if (loading) return <div style={{ background: '#0f0f0f', color: '#fff', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>Cargando panel...</div>;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f0f0f', color: '#fff', padding: '40px 20px', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333', paddingBottom: '20px', marginBottom: '30px' }}>
          <h1 style={{ fontSize: '26px', margin: 0 }}>Gestión Área de Clientes</h1>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => router.push('/admin/areaclientes/nuevo')} style={{ padding: '10px 16px', background: '#e50914', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
              + Crear Nuevo (Post o Pack)
            </button>
            <button onClick={() => router.push('/area-cliente')} style={{ padding: '10px 16px', background: '#333', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
              Ver Área Cliente
            </button>
          </div>
        </div>

        {message && <div style={{ background: '#1e3a8a', color: '#93c5fd', padding: '12px', borderRadius: '6px', marginBottom: '20px', textAlign: 'center' }}>{message}</div>}

        {/* Configuración de Precio */}
        <div style={{ background: '#1a1a1a', padding: '25px', borderRadius: '8px', border: '1px solid #333', marginBottom: '30px' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '15px' }}>Precio de la Suscripción Mensual</h2>
          <form onSubmit={handleUpdatePrice} style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <input 
              type="text" 
              value={price} 
              onChange={(e) => setPrice(e.target.value)} 
              style={{ padding: '10px', background: '#262626', border: '1px solid #444', color: '#fff', borderRadius: '4px', width: '100px' }}
            />
            <span style={{ color: '#aaa' }}>€ / mes</span>
            <button type="submit" style={{ padding: '10px 20px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
              Actualizar Precio
            </button>
          </form>
        </div>

        {/* Listado de Posts */}
        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '15px', borderLeft: '4px solid #3b82f6', paddingLeft: '10px' }}>Posts Publicados</h2>
          {posts.map(post => (
            <div key={post.id} style={{ background: '#1a1a1a', padding: '15px 20px', borderRadius: '6px', border: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div>
                <h3 style={{ margin: '0 0 5px 0', fontSize: '16px' }}>{post.title}</h3>
                <p style={{ margin: 0, color: '#aaa', fontSize: '14px' }}>{post.content.substring(0, 80)}...</p>
              </div>
              <button onClick={() => handleDeletePost(post.id)} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer' }}>
                Borrar
              </button>
            </div>
          ))}
        </div>

        {/* Listado de Packs */}
        <div>
          <h2 style={{ fontSize: '20px', marginBottom: '15px', borderLeft: '4px solid #e50914', paddingLeft: '10px' }}>Packs de Descarga Publicados</h2>
          {packs.map(pack => (
            <div key={pack.id} style={{ background: '#1a1a1a', padding: '15px 20px', borderRadius: '6px', border: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div>
                <h3 style={{ margin: '0 0 5px 0', fontSize: '16px' }}>{pack.title}</h3>
                <p style={{ margin: 0, color: '#aaa', fontSize: '14px' }}>Archivo R2: {pack.file_key}</p>
              </div>
              <button onClick={() => handleDeletePack(pack.id)} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer' }}>
                Borrar
              </button>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
