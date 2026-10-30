import { useEffect, useRef } from 'react';

// checkBeforePay (opcional): función async que devuelve true/false. Si se
// pasa, se ejecuta al pulsar el botón de PayPal y, si devuelve false, NO se
// abre el cobro. Se usa para el límite semanal de servicios y clases (después
// de cobrar ya no se podría rechazar el pedido). Si no se pasa, el botón se
// comporta exactamente igual que siempre.
export default function PayPalButton({ amount, currency = 'EUR', label, onSuccess, checkBeforePay }) {
  const ref = useRef(null);
  const checkRef = useRef(checkBeforePay);
  checkRef.current = checkBeforePay;

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
    if (!clientId || !ref.current) return;

    const renderButtons = () => {
      if (!window.paypal || !ref.current) return;
      ref.current.innerHTML = '';
      window.paypal
        .Buttons({
          fundingSource: window.paypal.FUNDING.PAYPAL,
          style: { color: 'gold', shape: 'rect', label: 'paypal', height: 45 },
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
        })
        .render(ref.current);
    };

    const existing = document.querySelector('script[data-paypal-sdk]');
    if (existing) {
      renderButtons();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=${currency}&disable-funding=card`;
    script.dataset.paypalSdk = 'true';
    script.onload = renderButtons;
    document.body.appendChild(script);
  }, [amount, currency, label, onSuccess]);

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
    </>
  );
}
