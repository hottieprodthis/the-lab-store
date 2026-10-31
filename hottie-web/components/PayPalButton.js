import { useEffect, useRef, useState } from 'react';

// Casilla (sin marcar) para salir con el nombre en los avisos de compras de la
// web (components/AvisoCompras.js). Se recuerda durante la visita y viaja al
// servidor en la cabecera x-mostrar-nombre (lib/cabecerasPago.js).
function CasillaMostrarNombre() {
  const [marcada, setMarcada] = useState(false);
  useEffect(() => {
    try {
      setMarcada(sessionStorage.getItem('thelab-mostrar-nombre') === '1');
    } catch {}
  }, []);
  const cambiar = (valor) => {
    setMarcada(valor);
    try {
      sessionStorage.setItem('thelab-mostrar-nombre', valor ? '1' : '0');
    } catch {}
  };
  return (
    <label className="mt-3 flex cursor-pointer items-start gap-2 text-left font-body text-[11px] leading-relaxed text-muted">
      <input
        type="checkbox"
        checked={marcada}
        onChange={(e) => cambiar(e.target.checked)}
        className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-[#CCFF00]"
      />
      <span>
        Mostrar mi nombre (solo el nombre de pila) y mi país en los avisos de compras de la web. Si no lo marcas, saldrá como
        «Alguien». Nunca se muestran apellidos, correo ni ubicación exacta, y no vendemos tus datos.{' '}
        <a href="/politica-de-privacidad" target="_blank" rel="noopener noreferrer" className="underline hover:text-paper">
          Más información
        </a>
        .
      </span>
    </label>
  );
}

// checkBeforePay (opcional): función async que devuelve true/false. Si se
// pasa, se ejecuta al pulsar el botón de PayPal y, si devuelve false, NO se
// abre el cobro. Se usa para el límite semanal de servicios y clases (después
// de cobrar ya no se podría rechazar el pedido). Si no se pasa, el botón se
// comporta exactamente igual que siempre.
// plazos (opcional): añade debajo el botón "Paga en 3 plazos" de PayPal (solo
// sale si PayPal se lo ofrece a ese comprador). Se cobra entero al momento;
// los plazos son entre el cliente y PayPal.
export default function PayPalButton({ amount, currency = 'EUR', label, onSuccess, checkBeforePay, plazos = false }) {
  const ref = useRef(null);
  const checkRef = useRef(checkBeforePay);
  checkRef.current = checkBeforePay;

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
    if (!clientId || !ref.current) return;

    const renderButtons = () => {
      if (!window.paypal || !ref.current) return;
      ref.current.innerHTML = '';
      const opciones = (fundingSource) => ({
          fundingSource,
          style: fundingSource === window.paypal.FUNDING.PAYPAL
            ? { color: 'gold', shape: 'rect', label: 'paypal', height: 45 }
            : { shape: 'rect', height: 45 },
          ...(checkBeforePay
            ? {
                onClick: async (data, actions) => {
                  const permitido = checkRef.current ? await checkRef.current() : true;
                  return permitido ? actions.resolve() : actions.reject();
                },
              }
            : {}),
          createOrder: (data, actions) =>
            actions.order.create({
              purchase_units: [
                { description: label, amount: { value: Number(amount).toFixed(2), currency_code: currency } },
              ],
            }),
          onApprove: async (data, actions) => {
            const details = await actions.order.capture();
            if (onSuccess) onSuccess(details);
          },
        });
      window.paypal.Buttons(opciones(window.paypal.FUNDING.PAYPAL)).render(ref.current);
      if (plazos && window.paypal.FUNDING.PAYLATER) {
        const botonPlazos = window.paypal.Buttons(opciones(window.paypal.FUNDING.PAYLATER));
        if (botonPlazos.isEligible()) {
          const hueco = document.createElement('div');
          hueco.className = 'mt-2';
          ref.current.appendChild(hueco);
          botonPlazos.render(hueco);
        }
      }
    };

    const existing = document.querySelector('script[data-paypal-sdk]');
    if (existing) {
      renderButtons();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=${currency}&disable-funding=card&enable-funding=paylater`;
    script.dataset.paypalSdk = 'true';
    script.onload = renderButtons;
    document.body.appendChild(script);
  }, [amount, currency, label, onSuccess, plazos]);

  // Debajo de los botones de pago (tarjeta y PayPal) va siempre el aviso de
  // que no hay devoluciones, para que se vea antes de pagar.
  return (
    <>
      <div ref={ref} className="w-full relative z-10" />
      <p className="mt-3 text-center font-body text-[11px] leading-relaxed text-muted">
        Al pagar aceptas las{' '}
        <a href="/condiciones-de-venta" target="_blank" rel="noopener noreferrer" className="text-paper underline hover:text-volt">
          condiciones de venta
        </a>
        : no se hacen devoluciones una vez realizado el pago.
      </p>
      {!label?.toLowerCase().includes('suscripci') && <CasillaMostrarNombre />}
    </>
  );
}
