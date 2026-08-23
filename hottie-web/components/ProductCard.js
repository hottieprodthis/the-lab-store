import Link from 'next/link';
import { formatPrice } from '../lib/format';

export default function ProductCard({ product }) {
  return (
    <Link
      href={`/tienda/${product.slug}`}
      className="group block overflow-hidden rounded-sm border border-white/10 bg-surface transition hover:border-volt/60"
    >
      <div className="aspect-square overflow-hidden bg-surface2">
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image_url}
            alt={product.name}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted">Sin imagen</div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-display text-xl tracking-wide text-paper">{product.name}</h3>
        <p className="mt-1 text-signal">{formatPrice(product.price_cents, product.currency)}</p>
      </div>
    </Link>
  );
}
