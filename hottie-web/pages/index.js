import Head from 'next/head';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import ProductCard from '../components/ProductCard';
import { supabase } from '../lib/supabaseClient';

export default function Home({ featured }) {
  return (
    <>
      <Head>
        <title>The Lab – Hottie | Producción musical</title>
        <meta
          name="description"
          content="Hottie: laboratorio de sonido sin límites. Kits de producción, mezcla, masterización y clases personalizadas."
        />
      </Head>

      <Navbar />

      <section className="relative overflow-hidden border-b border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-5 py-24 md:py-32">
          {/* ONDA DE FIRMA DE LA MARCA */}
          <div className="waveform" aria-hidden="true">
            {Array.from({ length: 8 }).map((_, i) => (
              <span key={i} />
            ))}
          </div>

          {/* TITULAR PRINCIPAL (H1) */}
          <h1 className="font-display text-6xl tracking-wide text-paper md:text-8xl leading-[0.95]">
            TU PRÓXIMO HIT
            <br />
            <span className="text-volt">COMIENZA AQUÍ.</span>
          </h1>

          {/* SUBTÍTULO */}
          <p className="max-w-xl text-lg text-muted font-body leading-relaxed">
            Transforma tu estudio en un laboratorio de sonido sin límites. Kits de producción, mezcla, masterización y clases personalizadas para convertir cualquier idea en un lanzamiento profesional.
          </p>

          {/* BOTONES DE ACCIÓN */}
          <div className="flex flex-wrap gap-4 pt-2">
            <Link
              href="/tienda"
              className="rounded-sm bg-volt px-6 py-3 text-sm font-semibold uppercase tracking-widest text-ink transition hover:brightness-110"
            >
              Ver tienda
            </Link>
            <Link
              href="/servicios"
              className="rounded-sm border border-white/20 px-6 py-3 text-sm font-semibold uppercase tracking-widest text-paper transition hover:border-signal hover:text-signal"
            >
              Ver servicios
            </Link>
          </div>
        </div>
      </section>

      {/* SECCIÓN DE DESTACADOS */}
      {featured?.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 py-20">
          <div className="mb-8 flex items-end justify-between">
            <h2 className="font-display text-3xl tracking-wide text-paper">Destacados</h2>
            <Link href="/tienda" className="text-sm uppercase tracking-widest text-signal hover:underline">
              Ver todo →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      <Footer />
    </>
  );
}

export async function getServerSideProps() {
  const { data } = await supabase
    .from('products')
    .select('*')
    .eq('active', true)
    .order('sort_order', { ascending: true })
    .limit(4);

  return { props: { featured: data || [] } };
}
