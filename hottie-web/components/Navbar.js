import Link from 'next/link';
import { useState } from 'react';
import SearchBar from './SearchBar';

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
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 gap-4">
        
        {/* LOGO CON MATRAZ ALINEADO EN LA MISMA LÍNEA BASE */}
        <Link href="/" className="font-display text-3xl sm:text-4xl tracking-wide text-paper inline-flex items-baseline gap-2.5 group shrink-0">
          <span>THE LAB</span>
          
          <span className="inline-flex items-center self-center -translate-y-[2px]">
            <svg
              viewBox="14.5 14.5 71 77"
              className="h-[0.68em] w-auto shrink-0 overflow-visible"
              aria-hidden="true"
            >
              <defs>
                <style>{`
                  @keyframes waveMotion {
                    0%, 100% { d: path('M 10 55 Q 35 50, 60 55 T 110 55 L 110 110 L 10 110 Z'); }
                    50% { d: path('M 10 58 Q 35 62, 60 56 T 110 58 L 110 110 L 10 110 Z'); }
                  }
                  .animated-wave {
                    animation: waveMotion 3s ease-in-out infinite;
                  }
                `}</style>

                {/* Máscara interna para contención perfecta del líquido */}
                <clipPath id="flask-inner">
                  <path d="M 44 20 L 56 20 L 56 40 L 78 78 C 82 85 76 88 68 88 L 32 88 C 24 88 18 85 22 78 L 44 40 Z" />
                </clipPath>
              </defs>

              {/* LÍQUIDO VERDE ANIMADO */}
              <g clipPath="url(#flask-inner)">
                <path
                  className="animated-wave fill-volt"
                  d="M 10 55 Q 35 50, 60 55 T 110 55 L 110 110 L 10 110 Z"
                />
              </g>

              {/* CONTORNO DEL MATRAZ */}
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
          </span>
        </Link>

        {/* BUSCADOR NEÓN INTEGRADO */}
        <SearchBar />

        {/* NAVEGACIÓN EN ESCRITORIO */}
        <nav className="hidden gap-8 md:flex shrink-0">
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
