import Link from 'next/link';
import { formatPrice } from '../lib/format';
import { useCart } from '../context/CartContext';

export default function ProductCard({ product }) {
  const { addToCart } = useCart();

  const handleAddToCart = (e) => {
    e.preventDefault(); // Evita que al hacer clic en el botón se abra el enlace del producto
    addToCart(product, false); // false indica que es un producto, no un servicio
  };

  return (
    <div className="group block overflow-hidden rounded-sm border border-white/10 bg-surface transition hover:border-volt/60">
      <Link href={`/tienda/${product.slug}`} className="block">
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
      </Link>
      
      <div className="p-4 flex items-center justify-between gap-2">
        <div>
          <Link href={`/tienda/${product.slug}`}>
            <h3 className="font-display text-xl tracking-wide text-paper hover:text-volt transition">{product.name}</h3>
          </Link>
          <p className="mt-1 text-signal">{formatPrice(product.price_cents, product.currency)}</p>
        </div>

        {/* Botón para Añadir al Carrito */}
        <button
          onClick={handleAddToCart}
          className="rounded-sm border border-[#CCFF00] px-3 py-2 text-xs uppercase font-bold tracking-widest text-[#CCFF00] transition hover:bg-[#CCFF00] hover:text-black shrink-0"
        >
          + Carrito
        </button>
      </div>
    </div>
  );
}
