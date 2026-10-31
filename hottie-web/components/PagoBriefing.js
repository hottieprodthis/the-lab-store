import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

// Los formularios de después de pagar solo se enseñan con el justificante de
// un pago real (session_id de Stripe, paypal o compra en la dirección), que
// comprueba el servidor (pages/api/briefing-permitido.js). El mismo
// justificante viaja con el formulario y el servidor lo vuelve a comprobar
// al enviarlo (pages/api/guardar-briefing.js).
// Devuelve { estado: 'comprobando' | 'ok' | 'no', ref }.
export function usePagoBriefing() {
  const router = useRouter();
  const [estado, setEstado] = useState('comprobando');
  const [ref, setRef] = useState({});

  useEffect(() => {
    if (!router.isReady) return;
    const q = router.query;
    const datos = {};
    ['session_id', 'paypal', 'compra'].forEach((k) => {
      if (typeof q[k] === 'string' && q[k]) datos[k] = q[k];
    });
    if (Object.keys(datos).length === 0) {
      setEstado('no');
      return;
    }
    setRef(datos);
    let vivo = true;
    fetch(`/api/briefing-permitido?${new URLSearchParams(datos)}`)
      .then((r) => r.json())
      .then((d) => {
        if (vivo) setEstado(d?.ok ? 'ok' : 'no');
      })
      .catch(() => {
        if (vivo) setEstado('no');
      });
    return () => {
      vivo = false;
    };
  }, [router.isReady, router.query]);

  return { estado, ref };
}

export function SinPagoBriefing() {
  return (
    <div className="mx-auto max-w-lg px-5 py-24 text-center text-paper">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-volt">Formulario de reserva</p>
      <h1 className="font-display text-3xl tracking-wide">Este formulario se abre después de pagar</h1>
      <p className="mt-4 text-sm leading-relaxed text-muted">
        Cuando reservas un servicio o una clase, al terminar el pago te traemos aquí para que nos cuentes los detalles. Si ya has
        pagado y ves este mensaje, escríbenos y lo resolvemos enseguida.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/servicios" className="rounded-sm bg-volt px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-ink hover:brightness-110">
          Ver servicios
        </Link>
        <Link href="/clases" className="rounded-sm border border-volt px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-volt hover:bg-volt hover:text-ink">
          Ver clases
        </Link>
        <Link href="/contacto" className="rounded-sm border border-white/20 px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-paper hover:border-volt">
          Contacto
        </Link>
      </div>
    </div>
  );
}
