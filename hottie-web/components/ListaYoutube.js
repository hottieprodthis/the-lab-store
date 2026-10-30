import { useState } from 'react';
import Image from 'next/image';

// Lista de reproducción de YouTube que solo se carga al pulsar el play
// (hasta entonces es la portada), para que la portada de la web cargue
// rápido: el reproductor de YouTube pesa más de 1 MB. Los subtítulos salen
// apagados (cc_load_policy=0) y la calidad la ajusta YouTube sola a la conexión.
export default function ListaYoutube({ lista, portada, titulo }) {
  const [abierta, setAbierta] = useState(false);

  if (abierta) {
    return (
      <iframe
        className="h-full w-full"
        src={`https://www.youtube-nocookie.com/embed/videoseries?list=${lista}&autoplay=1&rel=0&cc_load_policy=0`}
        title={titulo}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    );
  }

  return (
    <button type="button" onClick={() => setAbierta(true)} aria-label={`Ver ${titulo}`} className="group absolute inset-0 h-full w-full">
      <Image
        src={`/portadas/${portada}.jpg`}
        alt=""
        fill
        sizes="(min-width: 768px) 50vw, 100vw"
        quality={85}
        className="object-cover opacity-80 transition duration-300 group-hover:scale-105 group-hover:opacity-100"
      />
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-volt text-ink shadow-[0_0_28px_rgba(204,255,0,0.45)] transition group-hover:scale-110">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
      </span>
      <span className="absolute bottom-3 left-3 rounded-sm bg-ink/80 px-2 py-1 font-body text-[10px] font-semibold uppercase tracking-widest text-paper">
        Lista de reproducción
      </span>
    </button>
  );
}
