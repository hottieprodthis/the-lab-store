import { useEffect, useState } from 'react';
import Image from 'next/image';

// Fotos del recuadro de "Sobre Hottie" (portada): van cambiando con un
// fundido suave. Para añadir otra, súbela a public/ y añádela a la lista.
// Next las sirve al tamaño de cada pantalla, así que pesan poco.
const FOTOS = ['/sobre-mi-imagen.jpeg', '/sobre-mi-imagen-2.jpeg'];
const CADA_MS = 6000;

export default function FotosSobreMi() {
  const [actual, setActual] = useState(0);

  useEffect(() => {
    if (FOTOS.length < 2) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => setActual((n) => (n + 1) % FOTOS.length), CADA_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative aspect-square w-full">
      {FOTOS.map((src, i) => (
        <Image
          key={src}
          src={src}
          alt={i === 0 ? 'Estudio de Hottie, productor musical' : ''}
          fill
          sizes="(min-width: 768px) 40vw, 90vw"
          quality={85}
          className={`object-cover transition-opacity duration-1000 ${i === actual ? 'opacity-100' : 'opacity-0'}`}
        />
      ))}
    </div>
  );
}
