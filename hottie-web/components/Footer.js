export default function Footer() {
  return (
    <footer className="border-t border-white/10 py-16">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-8 px-5 text-center">
        
        {/* ENLACE SPOTIFY ESTRUCTURADO COMO LOS DEMÁS BOTONES */}
        <a
          href="https://open.spotify.com/artist/00Xfr9GULX46yJWg0wp7OG?si=qwEoyzBXSnqZd8gV4MXH0w&utm_source=copy-link"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex flex-col items-center gap-3 transition"
          aria-label="Escuchar en Spotify a Hottie"
        >
          {/* CONTENEDOR IDÉNTICO AL CARRITO Y SERVICIOS */}
          <div 
            className="flex h-12 w-12 items-center justify-center rounded-full bg-volt transition duration-200 group-hover:scale-105"
            style={{
              forcedColorAdjust: 'none',
              colorScheme: 'only light'
            }}
          >
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6 fill-ink"
              style={{
                forcedColorAdjust: 'none',
                colorScheme: 'only light',
                fill: '#0A0A0D'
              }}
              aria-hidden="true"
            >
              {/* TRAZADO SÓLO DE LAS ONDAS PARA EVITAR SUPERPOSICIÓN DE CAPAS */}
              <path d="M17.9 10.9c-3.5-2.1-9.3-2.3-12.7-1.2-.5.2-1.1-.1-1.3-.6-.2-.5.1-1.1.6-1.3 3.9-1.2 10.3-0.9 14.3 1.5.5.3.6.9.3 1.4-.3.4-.9.6-1.2.2zm-.1 2.8c-.3.4-.8.5-1.2.3-2.9-1.8-7.4-2.3-10.8-1.2-.4.1-.9-.1-1-.5-.1-.4.1-.9.5-1 3.9-1.2 8.9-.6 12.2 1.4.4.2.5.8.3 1.2zm-1.4 2.8c-.2.3-.6.4-.9.2-2.5-1.5-5.7-1.9-9.5-1-.3.1-.7-.1-.8-.4-.1-.3.1-.7.4-.8 4.2-1 7.8-.5 10.6 1.2.3.2.4.6.2.8z" />
            </svg>
          </div>

          {/* TEXTO EN BLANCO QUE CAMBIA A NEÓN AL PASAR EL RATÓN */}
          <span className="font-body text-sm font-semibold uppercase tracking-widest text-paper transition duration-200 group-hover:text-volt">
            Escuchar en Spotify
          </span>
        </a>

        {/* ONDA Y COPYRIGHT */}
        <div className="mt-2 flex flex-col items-center gap-4">
          <div className="waveform" aria-hidden="true">
            {Array.from({ length: 8 }).map((_, i) => (
              <span key={i} />
            ))}
          </div>
          <p className="text-xs uppercase tracking-widest text-muted">
            ©️ {new Date().getFullYear()} The Lab — Hottie · Salamanca, España
          </p>
        </div>

      </div>
    </footer>
  );
}
