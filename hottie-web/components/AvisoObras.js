import { useEffect, useState } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import Navbar from './Navbar';
import Footer from './Footer';
import { esAdminEnNavegador } from '../lib/adminNavegador';
import { supabase } from '../lib/supabaseClient';
import { suscripcionActiva } from '../lib/suscripcion';

// Cuenta atrás hasta la apertura programada; al llegar a cero recarga la
// página, que ya sale abierta (lib/obras.js deja de contar el ajuste).
function CuentaAtras({ hasta }) {
  const [quedan, setQuedan] = useState(null);
  useEffect(() => {
    const fin = new Date(hasta).getTime();
    const tic = () => {
      const ms = fin - Date.now();
      if (ms <= 0) {
        window.location.reload();
        return;
      }
      setQuedan(ms);
    };
    tic();
    const id = setInterval(tic, 1000);
    return () => clearInterval(id);
  }, [hasta]);
  if (quedan === null) return null;
  const s = Math.floor(quedan / 1000);
  const partes = [
    [Math.floor(s / 86400), 'días'],
    [Math.floor((s % 86400) / 3600), 'horas'],
    [Math.floor((s % 3600) / 60), 'min'],
    [s % 60, 'seg'],
  ];
  return (
    <div className="mt-8">
      <p className="font-body text-xs uppercase tracking-[0.3em] text-muted">Abrimos en</p>
      <div className="mt-3 flex justify-center gap-3 sm:gap-4">
        {partes.map(([n, txt]) => (
          <div key={txt} className="min-w-[64px] rounded-sm border border-white/10 bg-surface px-3 py-3">
            <p className="font-display text-4xl tabular-nums text-volt sm:text-5xl">{String(n).padStart(2, '0')}</p>
            <p className="mt-1 font-body text-[10px] uppercase tracking-widest text-muted">{txt}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// Muestra el aviso de "web en obras" en lugar de la página tapada (qué se
// tapa en cada modo: lib/obras.js) mientras el interruptor del panel esté activo.
// Si quien entra tiene la sesión de admin iniciada, ve la página normal con
// una franja arriba, para poder revisar los cambios antes de abrir.
export default function AvisoObras({ obras, children }) {
  const [esAdmin, setEsAdmin] = useState(false);
  // Acceso anticipado: en la Tienda, con las compras cerradas, los
  // suscriptores con la suscripción en vigor ven la página normal.
  const [esSuscriptor, setEsSuscriptor] = useState(false);

  useEffect(() => {
    let activo = true;
    esAdminEnNavegador().then((si) => {
      if (activo && si) setEsAdmin(true);
    });
    if (obras?.anticipadoAqui) {
      supabase.auth.getSession().then(async ({ data }) => {
        if (!data?.session) return;
        const { data: perfil } = await supabase
          .from('profiles')
          .select('is_admin, is_subscribed, subscribed_until')
          .eq('id', data.session.user.id)
          .maybeSingle();
        if (activo && suscripcionActiva(perfil)) setEsSuscriptor(true);
      });
    }
    return () => {
      activo = false;
    };
  }, [obras?.anticipadoAqui]);

  if (esSuscriptor && !esAdmin) {
    return (
      <>
        <div className="bg-volt px-4 py-2 text-center text-xs font-bold uppercase tracking-widest text-ink">
          Acceso anticipado: como suscriptor, ya puedes comprar en la tienda antes que nadie.
        </div>
        {children}
      </>
    );
  }

  if (esAdmin) {
    return (
      <>
        <div className="bg-volt px-4 py-2 text-center text-xs font-bold uppercase tracking-widest text-ink">
          {{
            obras: 'Web en obras',
            privada: 'Solo portada y contacto',
            compras: 'Compras cerradas',
          }[obras.modo] || 'Web en obras'}
          : solo tú ves esta página y puedes pagar para probar. Se quita desde el panel.
        </div>
        {children}
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Web en obras — The Lab</title>
        <meta name="robots" content="noindex" />
      </Head>
      <Navbar />
      <section className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center px-5 py-20 text-center">
        <div className="waveform mb-8" aria-hidden="true">
          {Array.from({ length: 8 }).map((_, i) => (
            <span key={i} />
          ))}
        </div>
        <p className="font-body text-xs uppercase tracking-[0.3em] text-volt">Estamos en obras</p>
        <h1 className="mt-4 font-display text-5xl leading-[0.95] tracking-wide text-paper md:text-7xl">
          EL LABORATORIO
          <br />
          <span className="text-volt">SE ESTÁ ACTUALIZANDO.</span>
        </h1>
        <p className="mt-6 max-w-lg font-body text-base leading-relaxed text-muted">{obras.mensaje}</p>
        {obras.apertura && <CuentaAtras hasta={obras.apertura} />}
        {obras.anticipadoAqui && (
          <p className="mt-6 max-w-lg rounded-sm border border-volt/40 bg-volt/5 px-4 py-3 font-body text-sm text-paper">
            Los suscriptores ya tienen acceso anticipado a la tienda.{' '}
            <Link href="/login" className="font-semibold text-volt underline">
              Inicia sesión
            </Link>{' '}
            para entrar.
          </p>
        )}
        <p className="mt-3 max-w-lg font-body text-sm text-muted">
          No se pueden hacer compras. Si tienes cualquier duda o un pedido pendiente, escríbenos.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link
            href="/contacto"
            className="rounded-sm bg-volt px-6 py-3 text-sm font-semibold uppercase tracking-widest text-ink transition hover:brightness-110 hover:shadow-[0_0_28px_rgba(204,255,0,0.55)]"
          >
            Contactar
          </Link>
          {obras.modo !== 'obras' && (
          <Link
            href="/"
            className="rounded-sm border border-white/20 px-6 py-3 text-sm font-semibold uppercase tracking-widest text-paper transition hover:border-paper hover:shadow-[0_0_28px_rgba(242,240,234,0.35)]"
          >
            Volver al inicio
          </Link>
          )}
        </div>
      </section>
      <Footer />
    </>
  );
}
