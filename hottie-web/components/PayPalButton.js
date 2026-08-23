import { useEffect, useRef } from 'react';

/**
 * Botón de pago con PayPal. Carga el SDK oficial de PayPal en el navegador
 * y crea un pedido con el importe indicado.
 *
 * OJO: esta implementación captura el pago desde el propio navegador, lo
 * cual es válido para empezar, pero para más seguridad en el futuro se
 * puede mover la "captura" del pago a una función de servidor (como ya
 * se hace con Stripe en /api/checkout).
 */
export default function PayPalButton({ amount, currency = 'EUR', label, onSuccess }) {
  const ref = useRef(null);

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
    if (!clientId || !ref.current) return;

    const renderButtons = () => {
      if (!window.paypal || !ref.current) return;
      ref.current.innerHTML = '';
      window.paypal
        .Buttons({
          style: { color: 'gold', shape: 'rect', label: 'paypal', height: 45 },
          createOrder: (data, actions) =>
            actions.order.create({
              purchase_units: [
                { description: label, amount: { value: amount.toFixed(2), currency_code: currency } },
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
    script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=${currency}`;
    script.dataset.paypalSdk = 'true';
    script.onload = renderButtons;
    document.body.appendChild(script);
  }, [amount, currency, label, onSuccess]);

  return <div ref={ref} />;
}
