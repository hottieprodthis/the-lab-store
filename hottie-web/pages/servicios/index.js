import Head from 'next/head';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import ServiceCard from '../../components/ServiceCard';
import { supabase } from '../../lib/supabaseClient';

export default function Servicios({ services }) {
  return (
    <>
      <Head>
        <title>Servicios — The Lab</title>
        <meta name="description" content="Mezcla, masterización, producción y clases personalizadas." />
      </Head>

      <Navbar />

      <section className="mx-auto max-w-6xl px-5 py-16">
        <h1 className="font-display text-5xl tracking-wide text-paper">Servicios</h1>
        <p className="mt-2 text-muted">Producción, mezcla, masterización y formación a medida.</p>

        {services.length === 0 ? (
          <p className="mt-12 text-muted">Todavía no hay servicios publicados.</p>
        ) : (
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {services.map((s) => (
              <ServiceCard key={s.id} service={s} />
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
    .from('services')
    .select('*')
    .eq('active', true)
    .order('sort_order', { ascending: true });

  return { props: { services: data || [] } };
}
