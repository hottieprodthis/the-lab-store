import Link from 'next/link';
import { formatPrice } from '../lib/format';
import { textoFinOferta } from '../lib/ofertas';

// Precio normal tachado, para ponerlo delante del precio de oferta.
export function PrecioTachado({ cents, currency }) {
  if (cents === null || cents === undefined) return null;
  return <span className="mr-2 text-muted line-through decoration-1">{formatPrice(cents, currency)}</span>;
}

// "Oferta hasta el 30/11 a las 23:59", o "Precio de suscriptor (−10 %)" si
// el precio rebajado es el de los suscriptores (lib/descuentoSuscriptor.js).
export function AvisoOferta({ fin, suscriptor, className = '' }) {
  if (suscriptor) {
    return (
      <span className={`block text-xs font-semibold uppercase tracking-wider text-volt ${className}`}>
        ⭐ Precio de suscriptor (−{suscriptor} %)
      </span>
    );
  }
  const texto = fin ? textoFinOferta(fin) : '';
  if (!texto) return null;
  return <span className={`block text-xs font-semibold uppercase tracking-wider text-volt ${className}`}>{texto}</span>;
}

// Para quien aún no está suscrito: lo que se ahorraría con la suscripción.
export function AvisoDescuentoSuscriptor({ porcentaje, className = '' }) {
  if (!porcentaje) return null;
  return (
    <Link
      href="/area-cliente"
      className={`mt-2 inline-flex items-center gap-1.5 rounded-sm border border-volt/40 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-volt transition hover:bg-volt hover:text-ink ${className}`}
    >
      ⭐ Suscriptores: −{porcentaje} % en esto
    </Link>
  );
}
