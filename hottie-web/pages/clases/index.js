import Head from 'next/head';
import Seo from '../../components/Seo';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import ServiceCard from '../../components/ServiceCard';
import { supabase } from '../../lib/supabaseClient';
import { aplicarOfertas } from '../../lib/ofertas';

export default function Clases({ classes }) {
  return (
    <>
      <Seo title="Clases — The Lab" description="Aprende producción musical, mezcla y masterización con sesiones personalizadas por reserva." path="/clases" />

      <Navbar />

      <section className="mx-auto max-w-6xl px-5 py-16">
        <h1 className="font-display text-5xl tracking-wide text-paper uppercase">Clases</h1>
        <p className="mt-2 text-muted">
          Aprende producción musical, mezcla y masterización con sesiones personalizadas por reserva.
        </p>

        {classes.length === 0 ? (
          <p className="mt-12 text-muted">Próximamente habrá nuevas clases disponibles.</p>
        ) : (
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {classes.map((c) => (
              <ServiceCard 
                key={c.id} 
                service={{
                  ...c,
                  isClass: true,
                  isService: false
                }} 
              />
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
    .from('classes')
    .select('*')
    .eq('active', true)
    .order('created_at', { ascending: false });

  return { props: { classes: aplicarOfertas(data || []) } };
}
