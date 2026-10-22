import { formatPrice } from '../lib/format';
import { textoFinOferta } from '../lib/ofertas';

// Precio normal tachado, para ponerlo delante del precio de oferta.
export function PrecioTachado({ cents, currency }) {
  if (cents === null || cents === undefined) return null;
  return <span className="mr-2 text-muted line-through decoration-1">{formatPrice(cents, currency)}</span>;
}

// "Oferta hasta el 30/11 a las 23:59".
export function AvisoOferta({ fin, className = '' }) {
  const texto = textoFinOferta(fin);
  if (!texto) return null;
  return <span className={`block text-xs font-semibold uppercase tracking-wider text-volt ${className}`}>{texto}</span>;
}
