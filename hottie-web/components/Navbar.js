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
          
          {/* Matraz de Química SVG con Animación */}
          <div className="relative w-7 h-7 flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
              <defs>
                <style>{`
                  @keyframes wave {
                    0% { transform: translateY(0px) rotate(0deg); }
                    50% { transform: translateY(-2px) rotate(3deg); }
                    100% { transform: translateY(0px) rotate(0deg); }
                  }
                  .flask-liquid {
                    animation: wave 3s ease-in-out infinite;
                    transform-origin: center;
                  }
                `}</style>
                <clipPath id="flask-clip">
                  <path d="M 43 12 L 57 12 L 57 38 L 82 74 C 86 80 82 86 74 86 L 26 86 C 18 86 14 80 18 74 L 43 38 Z" />
                </clipPath>
              </defs>

              {/* Líquido verde animado */}
              <g clipPath="url(#flask-clip)">
                <path
                  className="flask-liquid fill-volt"
                  d="M 10 52 Q 30 48, 50 52 T 90 52 L 90 95 L 10 95 Z"
                />
              </g>

              {/* Contorno del Matraz */}
              <path
                d="M 40 12 L 60 12 M 45 12 L 45 38 L 78 82 C 81 86 78 90 71 90 L 29 90 C 22 90 19 86 22 82 L 55 38 L 55 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
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
