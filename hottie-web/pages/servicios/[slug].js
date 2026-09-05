import Head from 'next/head';
import { useState } from 'react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import { supabase } from '../../lib/supabaseClient';
import { formatPrice } from '../../lib/format';
import { useCart } from '../../context/CartContext';

export default function DetalleServicio({ service }) {
  const [loadingPlan, setLoadingPlan] = useState(null);
  const { addToCart } = useCart();

  if (!service) {
    return (
      <>
        <Navbar />
        <div className="mx-auto max-w-4xl px-5 py-24 text-center">
          <h1 className="text-3xl font-bold text-paper">Servicio no encontrado</h1>
        </div>
        <Footer />
      </>
    );
  }

  const hasPlans = Array.isArray(service.plans) && service.plans.length > 0;

  const handleCheckoutPlan = async (plan) => {
    setLoadingPlan(plan.name);
    try {
      const planPriceCents = Math.round(parseFloat(plan.price) * 100);
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: service.id,
          isService: true,
          planName: plan.name,
          customPriceCents: planPriceCents,
        }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('Error al iniciar la reserva.');
        setLoadingPlan(null);
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión.');
      setLoadingPlan(null);
    }
  };

  const handleAddToCartPlan = (plan) => {
    const planPriceCents = Math.round(parseFloat(plan.price) * 100);
    const planItem = {
      ...service,
      id: `${service.id}-${plan.name.toLowerCase().replace(/\s+/g, '-')}`,
      name: `${service.name} (${plan.name})`,
      price_cents: planPriceCents,
      price: parseFloat(plan.price),
    };
    addToCart(planItem, true);
  };

  return (
    <>
      <Head>
        <title>{service.name} — The Lab</title>
        <meta name="description" content={service.description} />
      </Head>

      <Navbar />

      <section className="mx-auto max-w-5xl px-5 py-16">
        <h1 className="font-display text-4xl text-paper uppercase md:text-5xl">{service.name}</h1>
        <p className="mt-4 text-base leading-relaxed text-muted max-w-2xl">{service.description}</p>

        {hasPlans ? (
          <div className="mt-12 space-y-6">
            <h2 className="font-display text-xl text-volt uppercase tracking-wider">Planes disponibles</h2>
            <div className="grid gap-6 md:grid-cols-3">
              {service.plans.map((plan, i) => (
                <div key={i} className="flex flex-col justify-between rounded-sm border border-white/10 bg-surface p-6 transition hover:border-signal/60">
                  <div>
                    <h3 className="font-display text-2xl text-paper uppercase">{plan.name}</h3>
                    <p className="mt-4 text-2xl font-bold text-volt">
                      {formatPrice(Math.round(parseFloat(plan.price) * 100), service.currency)}
                    </p>
                    {plan.description && (
                      <p className="mt-4 text-sm text-muted leading-relaxed whitespace-pre-line">{plan.description}</p>
                    )}
                  </div>

                  <div className="mt-8 flex items-center justify-end gap-2 border-t border-white/10 pt-4">
                    <button
                      onClick={() => handleAddToCartPlan(plan)}
                      className="rounded-sm border border-[#CCFF00] px-3 py-2 text-xs font-semibold uppercase tracking-widest text-[#CCFF00] transition hover:bg-[#CCFF00] hover:text-black"
                    >
                      + Carrito
                    </button>
                    <button
                      onClick={() => handleCheckoutPlan(plan)}
                      disabled={loadingPlan === plan.name}
                      className="rounded-sm border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-paper transition hover:border-signal hover:text-signal disabled:opacity-50"
                    >
                      {loadingPlan === plan.name ? 'CARGANDO...' : 'RESERVAR'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-12 rounded-sm border border-white/10 bg-surface p-8 text-center max-w-md">
            <p className="text-2xl font-bold text-volt">
              {service.price_cents ? formatPrice(service.price_cents, service.currency) : 'A consultar'}
            </p>
          </div>
        )}
      </section>

      <Footer />
    </>
  );
}

export async function getServerSideProps({ params }) {
  const { data } = await supabase
    .from('services')
    .select('*')
    .eq('slug', params.slug)
    .eq('active', true)
    .single();

  return {
    props: {
      service: data || null,
    },
  };
}
