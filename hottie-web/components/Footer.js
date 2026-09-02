export default function Footer() {
  return (
    <footer className="border-t border-white/10 py-16">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-8 px-5 text-center">
        
        {/* BLOQUE SPOTIFY DESTACADO */}
        <div className="my-4 flex flex-col items-center gap-5">
          {/* LOGO SPOTIFY GRANDE */}
          <svg
            viewBox="0 0 24 24"
            className="h-14 w-14 fill-volt drop-shadow-[0_0_12px_rgba(203,254,0,0.3)]"
            aria-hidden="true"
          >
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.48.66.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141 C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.18-.1.2-.78-.42-.6-.18-.78-.779-.42-1.38 4.26-1.26 11.28-1.02 15.72 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
          </svg>

          {/* BOTÓN NEÓN DEBAJO DEL LOGO */}
          <a
            href="https://open.spotify.com/artist/00Xfr9GULX46yJWg0wp7OG?si=qwEoyzBXSnqZd8gV4MXH0w&utm_source=copy-link"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-sm bg-volt px-8 py-3.5 text-sm font-bold uppercase tracking-widest text-ink transition hover:brightness-110 shadow-lg shadow-volt/20"
            aria-label="Escuchar en Spotify a Hottie"
          >
            Escuchar en Spotify
          </a>
        </div>

        {/* ONDA Y COPYRIGHT CON ESPACIADO AMPLIADO */}
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
