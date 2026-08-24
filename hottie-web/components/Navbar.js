import Link from 'next/link';
import { useState } from 'react';

const links = [
  { href: '/tienda', label: 'Tienda' },
  { href: '/servicios', label: 'Servicios' },
  { href: '/contacto', label: 'Contacto' },
  { href: '/faq', label: 'FAQ' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-ink/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        
        {/* LOGO CON MATRAZ ANIMADO */}
        <Link href="/" className="font-display text-3xl tracking-wide text-paper flex items-center gap-2 group">
          <span>THE LAB</span>
          
          {/* Matraz de Química SVG ajustado */}
          <div className="relative w-8 h-8 flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <defs>
                <style>{`
                  @keyframes wave {
                    0% { transform: translateY(0px) rotate(0deg); }
                    50% { transform: translateY(-1.5px) rotate(2deg); }
                    100% { transform: translateY(0px) rotate(0deg); }
                  }
                  .flask-liquid {
                    animation: wave 2.5s ease-in-out infinite;
                    transform-origin: center;
                  }
                `}</style>
                {/* Máscara interna ajustada al cuerpo del matraz */}
                <clipPath id="flask-clip">
                  <polygon points="46,15 54,15 54,38 76,78 24,78 46,38" />
                </clipPath>
              </defs>

              {/* LÍQUIDO VERDE (Recortado perfectamente dentro) */}
              <g clipPath="url(#flask-clip)">
                <path
                  className="flask-liquid fill-volt"
                  d="M 10 52 Q 30 48, 50 52 T 90 52 L 90 85 L 10 85 Z"
                />
              </g>

              {/* CONTORNO Y BORDE DEL MATRAZ (Va encima para sellar los bordes) */}
              <path
                d="M 40 15 L 60 15 M 46 15 L 46 38 L 78 82 C 80 86 76 88 70 88 L 30 88 C 24 88 20 86 22 82 L 54 38 L 54 15"
                fill="none"
                stroke="currentColor"
                strokeWidth="7"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-paper transition-colors group-hover:text-volt"
              />
            </svg>
          </div>
        </Link>

        {/* NAVEGACIÓN EN ESCRITORIO */}
        <nav className="hidden gap-8 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="font-body text-sm uppercase tracking-widest text-muted transition hover:text-signal"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* BOTÓN MENÚ MÓVIL */}
        <button
          className="text-paper md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Abrir menú"
          aria-expanded={open}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* MENÚ MÓVIL DESPLEGABLE */}
      {open && (
        <nav className="flex flex-col gap-1 border-t border-white/10 px-5 py-3 md:hidden">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="py-2 font-body text-sm uppercase tracking-widest text-muted hover:text-signal"
              onClick={() => setOpen(false)}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
