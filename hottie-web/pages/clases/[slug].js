import Head from 'next/head';
import Seo from '../../components/Seo';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import { supabase } from '../../lib/supabaseClient';
import { propsConObras } from '../../lib/obras';
import { aplicarOferta } from '../../lib/ofertas';
import { formatPrice } from '../../lib/format';
import { PrecioTachado, AvisoOferta } from '../../components/PrecioOferta';
import { useCart } from '../../context/CartContext';
import { obtenerDisponibilidad, bloqueoPara, permitirPago } from '../../lib/disponibilidadClient';
import PayPalButton from '../../components/PayPalButton';

export default function DetalleClase({ clase }) {
  const [loadingPlan, setLoadingPlan] = useState(null);
  // Límite semanal de clases (panel de admin): si ya no quedan plazas esta
  // semana se desactivan "+ Carrito" y "RESERVAR" y se avisa.
  const [disp, setDisp] = useState(null);
  useEffect(() => {
    let activo = true;
    obtenerDisponibilidad().then((d) => {
      if (activo) setDisp(d);
    });
    return () => {
      activo = false;
    };
  }, []);
  const bloqueoBase = bloqueoPara(disp, 'clase', clase?.cupo);
  const agotado = bloqueoBase.agotado;
  // Nombre del plan cuyo menú de "cómo pagar" está abierto (Stripe/Bizum o
  // PayPal). Antes RESERVAR lanzaba Stripe directamente sin dar opción a
  // pagar con PayPal, que solo existía en la ficha de producto de tienda.
  const [openPaymentPlan, setOpenPaymentPlan] = useState(null);
  const [paypalDonePlan, setPaypalDonePlan] = useState(null);
  const { addToCart } = useCart();

  if (!clase) {
    return (
      <>
        <Navbar />
        <div className="mx-auto max-w-4xl px-5 py-24 text-center">
          <h1 className="text-3xl font-bold text-paper">Clase no encontrada</h1>
        </div>
        <Footer />
      </>
    );
  }

  const hasPlans = Array.isArray(clase.plans) && clase.plans.length > 0;
  // El tipo de cupo de cada plan manda sobre el del clase.
  const bloqueoDe = (plan) => bloqueoPara(disp, 'clase', (plan && plan.cupo) || clase.cupo);

  const handleCheckoutPlan = async (plan) => {
    setLoadingPlan(plan.name);
    try {
      const planPriceCents = Math.round(parseFloat(plan.price) * 100);
      // Adjuntamos el usuario logueado (si lo hay) para que esta reserva
      // también quede asociada a su historial en el área de clientes.
      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: clase.id,
          isService: true,
          planName: plan.name,
          customPriceCents: planPriceCents,
          returnUrl: window.location.href,
          userId: session?.user?.id || null,
          userEmail: session?.user?.email || null,
        }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Error al iniciar la reserva.');
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
    // OJO: antes esto ponía "isService: true" y nada de "isClass", así que
    // el carrito y el checkout no tenían forma de saber que esto era una
    // CLASE (la trataban como un servicio más). Por eso un pedido de
    // servicio+clase (o producto+clase) solo pedía el formulario y la
    // página de gracias de servicio. Ahora se marca explícitamente como
    // clase, y "addToCart(planItem, false)" evita que el segundo
    // parámetro (que fuerza isService) la vuelva a marcar como servicio.
    const planItem = {
      ...clase,
      id: `${clase.id}-${plan.name.toLowerCase().replace(/\s+/g, '-')}`,
      name: `${clase.name} (${plan.name})`,
      price_cents: planPriceCents,
      price: parseFloat(plan.price),
      isClass: true,
      isService: false,
      // El plan puede tener su propio tipo de cupo; el carrito lo necesita
      // para no dejar acumular más unidades de las que caben.
      cupo: plan.cupo || clase.cupo || '',
    };
    addToCart(planItem, false);
  };

  // Registra en el historial (y envía los correos) una reserva de un plan
  // concreto pagada con PayPal. Se manda el precio y el nombre YA con el
  // plan incluido porque pages/api/registrar-pago-paypal.js guarda por
  // defecto el precio base de la clase, no el de un plan concreto.
  const handlePaypalPlanSuccess = async (plan, details) => {
    setPaypalDonePlan(plan.name);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const payerEmail = details?.payer?.email_address || null;
      const payerName = [details?.payer?.name?.given_name, details?.payer?.name?.surname]
        .filter(Boolean)
        .join(' ');
      const planPriceCents = Math.round(parseFloat(plan.price) * 100);

      await fetch('/api/registrar-pago-paypal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'clase',
          itemId: clase.id,
          planName: plan.name,
          amountCents: planPriceCents,
          userId: session?.user?.id || null,
          userEmail: session?.user?.email || payerEmail,
          payerEmail,
          payerName,
          paypalOrderId: details?.id || null,
        }),
      });
    } catch (err) {
      console.error('No se pudo registrar el pago de PayPal de esta clase en el historial:', err);
    }

    // Igual que al pagar con tarjeta, el cliente va nada más pagar al
    // formulario de su clase.
    window.location.href = '/clases/briefing?tipo=clase';
  };

  // --- Compra directa cuando la clase NO tiene planes (precio único) ---
  // Antes, si entrabas aquí (por ejemplo desde el buscador) a una clase sin
  // planes, esta página solo mostraba el precio, sin ninguna forma de
  // comprarla: el "+ Carrito" y "RESERVAR" solo existían en la tarjeta del
  // listado (components/ServiceCard.js), nunca en esta ficha. Usamos
  // openPaymentPlan/paypalDonePlan/loadingPlan con la clave especial
  // 'unico' para no duplicar estados, ya que esta rama y la de planes
  // nunca se muestran a la vez (hasPlans decide una u otra).
  const handleCheckoutBase = async () => {
    setLoadingPlan('unico');
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: clase.id,
          isService: true,
          returnUrl: window.location.href,
          userId: session?.user?.id || null,
          userEmail: session?.user?.email || null,
        }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Error al iniciar la reserva.');
        setLoadingPlan(null);
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión.');
      setLoadingPlan(null);
    }
  };

  const handlePaypalBaseSuccess = async (details) => {
    setPaypalDonePlan('unico');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const payerEmail = details?.payer?.email_address || null;
      const payerName = [details?.payer?.name?.given_name, details?.payer?.name?.surname]
        .filter(Boolean)
        .join(' ');

      await fetch('/api/registrar-pago-paypal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'clase',
          itemId: clase.id,
          userId: session?.user?.id || null,
          userEmail: session?.user?.email || payerEmail,
          payerEmail,
          payerName,
          paypalOrderId: details?.id || null,
        }),
      });
    } catch (err) {
      console.error('No se pudo registrar el pago de PayPal de esta clase (sin plan) en el historial:', err);
    }

    // Igual que al pagar con tarjeta, el cliente va nada más pagar al
    // formulario de su clase.
    window.location.href = '/clases/briefing?tipo=clase';
  };

  return (
    <>
      <Seo
        title={`${clase.name} — The Lab`}
        description={clase.description || `${clase.name}: clase de producción musical de The Lab by Hottie.`}
        path={`/clases/${clase.slug}`}
        image={clase.image_url}
      />

      <Navbar />

      <section className="mx-auto max-w-5xl px-5 py-16">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="font-display text-4xl text-paper uppercase md:text-5xl">{clase.name}</h1>
            <p className="mt-4 text-base leading-relaxed text-muted max-w-2xl">{clase.description}</p>
            {clase.plazo_entrega && (
              <p className="mt-4 inline-flex items-center gap-1.5 rounded-sm border border-signal/30 bg-signal/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-signal">
                <span aria-hidden="true">⏱</span> {clase.plazo_entrega}
              </p>
            )}
          </div>
          {clase.image_url && (
            <img
              src={clase.image_url}
              alt={clase.name}
              className="h-24 w-24 shrink-0 rounded-sm border border-white/10 object-cover sm:h-32 sm:w-32"
            />
          )}
        </div>

        {!hasPlans && agotado && (
          <div className="mt-8 rounded-sm border border-volt/40 bg-volt/10 p-4 text-sm text-paper">
            {bloqueoBase.motivo}
          </div>
        )}

        {hasPlans ? (
          <div className="mt-12 space-y-6">
            <h2 className="font-display text-xl text-volt uppercase tracking-wider">Planes disponibles</h2>
            <div className="grid gap-6 md:grid-cols-3">
              {clase.plans.map((plan, i) => (
                <div key={i} className="flex flex-col justify-between rounded-sm border border-white/10 bg-surface p-6 transition hover:border-signal/60">
                  <div>
                    <h3 className="font-display text-2xl text-paper uppercase">{plan.name}</h3>
                    <p className="mt-4 text-2xl font-bold text-volt">
                      {plan.precio_original !== undefined && (
                        <PrecioTachado cents={Math.round(parseFloat(plan.precio_original) * 100)} currency={clase.currency} />
                      )}
                      {formatPrice(Math.round(parseFloat(plan.price) * 100), clase.currency)}
                    </p>
                    {plan.precio_original !== undefined && clase.oferta && <AvisoOferta fin={clase.oferta.fin} className="mt-1" />}
                    {plan.description && (
                      <p className="mt-4 text-sm text-muted leading-relaxed whitespace-pre-line">{plan.description}</p>
                    )}
                  </div>

                  <div className="mt-8 flex items-center justify-end gap-2 border-t border-white/10 pt-4">
                    <button
                      onClick={() => handleAddToCartPlan(plan)}
                      disabled={bloqueoDe(plan).agotado}
                      className="rounded-sm border border-[#CCFF00] px-3 py-2 text-xs font-semibold uppercase tracking-widest text-[#CCFF00] transition hover:bg-[#CCFF00] hover:text-black disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[#CCFF00]"
                    >
                      + Carrito
                    </button>
                    <button
                      onClick={() => setOpenPaymentPlan(openPaymentPlan === plan.name ? null : plan.name)}
                      disabled={bloqueoDe(plan).agotado}
                      className="rounded-sm border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-paper transition hover:border-signal hover:text-signal disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      RESERVAR
                    </button>
                  </div>

                  {bloqueoDe(plan).agotado && (
                    <p className="mt-3 text-right text-xs text-volt">{bloqueoDe(plan).motivo}</p>
                  )}

                  {/* Menú con las dos formas de pago, igual que en la
                      ficha de producto de tienda: antes RESERVAR lanzaba
                      Stripe directamente sin dar opción a PayPal. */}
                  {openPaymentPlan === plan.name && (
                    <div className="mt-4 border-t border-white/10 pt-4 space-y-3">
                      {paypalDonePlan === plan.name ? (
                        <p className="text-sm text-volt text-right">¡Pago con PayPal completado! Revisa tu correo.</p>
                      ) : (
                        <>
                          <button
                            onClick={() => handleCheckoutPlan(plan)}
                            disabled={loadingPlan === plan.name}
                            className="block w-full text-center rounded-sm bg-[#CCFF00] px-4 py-3 text-xs font-bold uppercase tracking-widest text-black transition hover:brightness-110 disabled:opacity-50"
                          >
                            {loadingPlan === plan.name ? 'CARGANDO...' : 'Pagar con tarjeta y más'}
                          </button>
                          <div className="relative flex py-1 items-center">
                            <div className="flex-grow border-t border-white/10"></div>
                            <span className="flex-shrink mx-3 text-muted text-xs uppercase font-semibold">O pagar con</span>
                            <div className="flex-grow border-t border-white/10"></div>
                          </div>
                          <div className="w-full relative z-10 min-h-[50px]">
                            <PayPalButton
                              amount={parseFloat(plan.price)}
                              currency={(clase.currency || 'eur').toUpperCase()}
                              label={`${clase.name} (${plan.name})`}
                              onSuccess={(details) => handlePaypalPlanSuccess(plan, details)}
                              checkBeforePay={() =>
                                permitirPago([{ tipo: 'clase', id: clase.id, name: `${clase.name} (${plan.name})`, quantity: 1 }])
                              }
                            />
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-12 max-w-md">
            <div className="rounded-sm border border-white/10 bg-surface p-8 text-center">
              <p className="text-2xl font-bold text-volt">
                {clase.oferta && <PrecioTachado cents={clase.oferta.precio_original_cents} currency={clase.currency} />}
                {clase.price_cents ? formatPrice(clase.price_cents, clase.currency) : 'A consultar'}
              </p>
              {clase.oferta && <AvisoOferta fin={clase.oferta.fin} className="mt-2" />}

              {clase.price_cents || clase.price ? (
                <div className="mt-6 flex items-center justify-center gap-2">
                  <button
                    onClick={() => addToCart({ ...clase, isClass: true, isService: false }, false)}
                    disabled={agotado}
                    className="rounded-sm border border-[#CCFF00] px-3 py-2 text-xs font-semibold uppercase tracking-widest text-[#CCFF00] transition hover:bg-[#CCFF00] hover:text-black disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[#CCFF00]"
                  >
                    + Carrito
                  </button>
                  <button
                    onClick={() => setOpenPaymentPlan(openPaymentPlan === 'unico' ? null : 'unico')}
                    disabled={agotado}
                    className="rounded-sm border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-paper transition hover:border-signal hover:text-signal disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    RESERVAR
                  </button>
                </div>
              ) : (
                <Link
                  href={`/contacto?clase=${clase.slug}`}
                  className="mt-6 inline-block rounded-sm border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-paper transition hover:border-signal hover:text-signal"
                >
                  Consultar
                </Link>
              )}
            </div>

            {openPaymentPlan === 'unico' && (clase.price_cents || clase.price) && (
              <div className="mt-4 rounded-sm border border-white/10 bg-surface p-6 space-y-3">
                {paypalDonePlan === 'unico' ? (
                  <p className="text-sm text-volt text-center">¡Pago con PayPal completado! Revisa tu correo.</p>
                ) : (
                  <>
                    <button
                      onClick={handleCheckoutBase}
                      disabled={loadingPlan === 'unico'}
                      className="block w-full text-center rounded-sm bg-[#CCFF00] px-4 py-3 text-xs font-bold uppercase tracking-widest text-black transition hover:brightness-110 disabled:opacity-50"
                    >
                      {loadingPlan === 'unico' ? 'CARGANDO...' : 'Pagar con tarjeta y más'}
                    </button>
                    <div className="relative flex py-1 items-center">
                      <div className="flex-grow border-t border-white/10"></div>
                      <span className="flex-shrink mx-3 text-muted text-xs uppercase font-semibold">O pagar con</span>
                      <div className="flex-grow border-t border-white/10"></div>
                    </div>
                    <div className="w-full relative z-10 min-h-[50px]">
                      <PayPalButton
                        amount={(clase.price_cents || Math.round((clase.price || 0) * 100)) / 100}
                        currency={(clase.currency || 'eur').toUpperCase()}
                        label={clase.name}
                        onSuccess={handlePaypalBaseSuccess}
                        checkBeforePay={() =>
                          permitirPago([{ tipo: 'clase', id: clase.id, name: clase.name, quantity: 1 }])
                        }
                      />
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      <Footer />
    </>
  );
}

export async function getServerSideProps({ params, res }) {
  const { data } = await supabase
    .from('classes')
    .select('*')
    .eq('slug', params.slug)
    .eq('active', true)
    .single();

  // Si no existe o está despublicado: página 404 de verdad (pages/404.js),
  // para que Google lo quite de sus resultados.
  if (!data) return { notFound: true };

  return propsConObras(supabase, res, { clase: aplicarOferta(data) || null }, { vacaciones: true });
}
