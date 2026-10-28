import Head from 'next/head';
import Seo from '../../components/Seo';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import ServiceCard from '../../components/ServiceCard';
import { supabase } from '../../lib/supabaseClient';
import { aplicarOfertas } from '../../lib/ofertas';
import { propsConObras } from '../../lib/obras';

export default function Servicios({ services }) {
  return (
    <>
      <Seo title="Servicios — The Lab" description="Mezcla, masterización, producción y seguimiento personalizado para tus canciones, con Hottie." path="/servicios" />

      <Navbar />

      <section className="mx-auto max-w-6xl px-5 py-16">
        <h1 className="font-display text-5xl tracking-wide text-paper">Servicios</h1>
        <p className="mt-2 text-muted">Producción, edición, mezcla y masterización.</p>

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

export async function getServerSideProps({ res }) {
  const { data } = await supabase
    .from('services')
    .select('*')
    .eq('active', true)
    .order('sort_order', { ascending: true });

  return propsConObras(supabase, res, { services: aplicarOfertas(data || []) });
}
