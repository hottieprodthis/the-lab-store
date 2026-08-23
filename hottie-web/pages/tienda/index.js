import Head from 'next/head';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import ProductCard from '../../components/ProductCard';
import { supabase } from '../../lib/supabaseClient';

export default function Tienda({ products }) {
  return (
    <>
      <Head>
        <title>Tienda — The Lab</title>
        <meta name="description" content="Kits de producción, packs y descargas digitales." />
      </Head>

      <Navbar />

      <section className="mx-auto max-w-6xl px-5 py-16">
        <h1 className="font-display text-5xl tracking-wide text-paper">Tienda</h1>
        <p className="mt-2 text-muted">Kits, packs y producciones listas para descargar.</p>

        {products.length === 0 ? (
          <p className="mt-12 text-muted">Todavía no hay productos publicados. Vuelve pronto.</p>
        ) : (
          <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>

      <Footer />
    </>
  );
}

export async function getServerSideProps() {
  const { data } = await supabase
    .from('products')
    .select('*')
    .eq('active', true)
    .order('sort_order', { ascending: true });

  return { props: { products: data || [] } };
}
