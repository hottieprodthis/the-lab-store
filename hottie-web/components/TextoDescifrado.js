import { useEffect, useState } from 'react';

// Texto que aparece "descifrándose" (letras al azar que se van fijando),
// inspirado en "Decrypted Text" de React Bits pero sin librerías extra.
// - Google y los lectores de pantalla siempre ven el texto real.
// - El texto real ocupa su sitio (invisible mientras dura el efecto), así
//   que nada de la página se mueve.
// - Si la persona tiene activado "reducir movimiento", no se anima.
const SIMBOLOS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&';

export default function TextoDescifrado({ texto, retraso = 0, velocidad = 40 }) {
  const [mostrado, setMostrado] = useState(null);

  useEffect(() => {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let fijadas = 0;
    let intervalo;
    const revolver = () =>
      texto
        .split('')
        .map((letra, i) => (i < fijadas || letra === ' ' ? letra : SIMBOLOS[Math.floor(Math.random() * SIMBOLOS.length)]))
        .join('');

    setMostrado(revolver());
    const inicio = setTimeout(() => {
      intervalo = setInterval(() => {
        fijadas += 0.5;
        if (fijadas >= texto.length) {
          clearInterval(intervalo);
          setMostrado(null);
        } else {
          setMostrado(revolver());
        }
      }, velocidad);
    }, retraso);

    return () => {
      clearTimeout(inicio);
      clearInterval(intervalo);
    };
  }, [texto, retraso, velocidad]);

  return (
    <span className="relative inline-block">
      <span style={mostrado ? { visibility: 'hidden' } : undefined}>{texto}</span>
      {mostrado && (
        <span aria-hidden="true" className="absolute left-0 top-0 whitespace-nowrap">
          {mostrado}
        </span>
      )}
    </span>
  );
}
