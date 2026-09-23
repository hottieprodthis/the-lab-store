import Link from 'next/link';
import { useState, useEffect } from 'react';
import SearchBar from './SearchBar';
import { supabase } from '../lib/supabaseClient';

const links = [
  { href: '/tienda', label: 'Tienda' },
  { href: '/servicios', label: 'Servicios' },
  { href: '/clases', label: 'Clases' },
  { href: '/contacto', label: 'Contacto' },
  { href: '/faq', label: 'FAQ' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [userDestination, setUserDestination] = useState('/login');

  useEffect(() => {
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUserDestination('/area-cliente');
      } else {
        setUserDestination('/login');
      }
    }
    checkSession();
  }, []);

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
              style={{
                forcedColorAdjust: 'none',
                colorScheme: 'only light'
              }}
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
                  style={{
                    forcedColorAdjust: 'none',
                    colorScheme: 'only light'
                  }}
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

        {/* CONTENEDOR DERECHO CON SEPARACIÓN CLARA PARA EL ICONO */}
        <div className="flex items-center gap-6 shrink-0">
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

          {/* SEPARADOR VISIBLE Y ICONO DE USUARIO APARTADO A LA DERECHA */}
          <div className="hidden md:block h-5 w-[1px] bg-white/15 ml-2 mr-1"></div>

          <Link
            href={userDestination}
            className="text-volt hover:brightness-110 transition flex items-center justify-center p-1"
            aria-label="Área de Clientes"
            title="Área de Clientes / Perfil"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="1.75"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 6.75a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
              />
            </svg>
          </Link>

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
          <Link
            href={userDestination}
            className="py-2 font-body text-sm uppercase tracking-widest text-volt hover:brightness-110 border-t border-white/10 mt-2 pt-3"
            onClick={() => setOpen(false)}
          >
            Área de Clientes / Perfil
          </Link>
        </nav>
      )}
    </header>
  );
}
