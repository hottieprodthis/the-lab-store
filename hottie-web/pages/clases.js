import { useEffect, useState } from 'react';
import Head from 'next/head';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ProductCard from '../components/ProductCard';
import { supabase } from '../lib/supabaseClient';

export default function Clases() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchClasses() {
      try {
        const { data, error } = await supabase
          .from('classes')
          .select('*')
          .eq('active', true)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setClasses(data || []);
      } catch (err) {
        console.error('Error cargando clases:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchClasses();
  }, []);

  return (
    <div className="min-h-screen bg-bg text-paper flex flex-col justify-between">
      <Head>
        <title>Clases 1 a 1 — The Lab</title>
      </Head>

      <div>
        <Header />

        <main className="mx-auto max-w-6xl px-5 py-12">
          <div className="mb-10">
            <h1 className="font-display text-4xl font-bold uppercase tracking-wide">CLASES 1 A 1</h1>
            <p className="mt-2 text-muted">
              Aprende producción musical, mezcla y masterización con sesiones personalizadas por reserva.
            </p>
          </div>

          {loading ? (
            <div className="py-12 text-center text-muted">Cargando clases…</div>
          ) : classes.length === 0 ? (
            <p className="text-muted">Próximamente habrá nuevas clases disponibles.</p>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {classes.map((item) => (
                <ProductCard key={item.id} item={item} type="clases" />
              ))}
            </div>
          )}
        </main>
      </div>

      <Footer />
    </div>
  );
}
