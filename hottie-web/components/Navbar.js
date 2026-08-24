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
        
        {/* LOGO CON MATRAZ AJUSTADO */}
        <Link href="/" className="font-display text-3xl tracking-wide text-paper flex items-center gap-2.5 group">
          <span>THE LAB</span>
          
          <div className="relative w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center self-center">
            <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
              <defs>
                <style>{`
                  @keyframes wave {
                    0%, 100% { transform: translateY(0px) rotate(0deg); }
                    50% { transform: translateY(-1.5px) rotate(2deg); }
                  }
                  .liquid-anim {
                    animation: wave 2.5s ease-in-out infinite;
                    transform-origin: 50% 70%;
                  }
                `}</style>
              </defs>

              {/* LÍQUIDO VERDE (Asentado en la base) */}
              <path
                className="liquid-anim fill-volt"
                d="M 26 78 L 38 52 C 45 50 55 50 62 52 L 74 78 C 74 81 70 82 66 82 L 34 82 C 30 82 26 81 26 78 Z"
              />

              {/* CONTORNO DEL MATRAZ EN LÍNEA GRUESA */}
              {/* Cuello y Labio superior */}
              <path
                d="M 38 18 H 62 M 44 18 V 38 L 22 76 C 18 83 23 88 31 88 H 69 C 77 88 82 83 78 76 L 56 38 V 18"
                fill="none"
                stroke="currentColor"
                strokeWidth="7"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-paper transition-colors group-hover:text-volt"
              />
              
              {/* Tapón o Marca superior interior */}
              <line
                x1="44"
                y1="26"
                x2="56"
                y2="26"
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
