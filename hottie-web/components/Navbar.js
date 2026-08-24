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
        
        {/* LOGO CON MATRAZ ALINEADO Y RELLENO HASTA LA BASE */}
        <Link href="/" className="font-display text-3xl sm:text-4xl tracking-wide text-paper flex items-center gap-3 leading-none group">
          <span>THE LAB</span>
          
          <div className="relative w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-full h-full overflow-hidden">
              <defs>
                <style>{`
                  @keyframes waveMotion {
                    0% { d: path('M 10 55 Q 35 50, 60 55 T 110 55 L 110 110 L 10 110 Z'); }
                    50% { d: path('M 10 58 Q 35 62, 60 56 T 110 58 L 110 110 L 10 110 Z'); }
                    100% { d: path('M 10 55 Q 35 50, 60 55 T 110 55 L 110 110 L 10 110 Z'); }
                  }
                  .animated-wave {
                    animation: waveMotion 3s ease-in-out infinite;
                  }
                `}</style>

                {/* Máscara interna para que NADA se salga del vidrio */}
                <clipPath id="flask-inner">
                  <path d="M 44 20 L 56 20 L 56 40 L 78 78 C 82 85 76 88 68 88 L 32 88 C 24 88 18 85 22 78 L 44 40 Z" />
                </clipPath>
              </defs>

              {/* LÍQUIDO VERDE (Llena toda la base sin huecos) */}
              <g clipPath="url(#flask-inner)">
                <path
                  className="animated-wave fill-volt"
                  d="M 10 55 Q 35 50, 60 55 T 110 55 L 110 110 L 10 110 Z"
                />
              </g>

              {/* CONTORNO DEL MATRAZ (Trazo limpio por encima) */}
              <path
                d="M 38 18 H 62 M 44 18 V 40 L 22 78 C 18 85 24 88 32 88 H 68 C 76 88 82 85 78 78 L 56 40 V 18"
                fill="none"
                stroke="currentColor"
                strokeWidth="7"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-paper transition-colors group-hover:text-volt"
              />

              {/* Marca superior interior */}
              <line
                x1="44"
                y1="27"
                x2="56"
                y2="27"
                stroke="currentColor"
                strokeWidth="5"
                strokeLinecap="round"
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
