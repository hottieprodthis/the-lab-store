import { useEffect, useRef, useState } from 'react';

// Pequeñas animaciones de la web (inspiradas en React Bits, sin librerías).
// Todas respetan "reducir movimiento" y, sin JavaScript, el contenido se ve
// igual (Google siempre lee el texto real).

const reducirMovimiento = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Avisa una sola vez cuando el elemento entra en pantalla.
function useAlVerse(ref, alVerse) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) return alVerse(true);
    const obs = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) {
          alVerse(true);
          obs.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}

// Número que cuenta desde 0 hasta "hasta" cuando aparece en pantalla.
export function Contador({ hasta, antes = '', despues = '', duracion = 1600 }) {
  const ref = useRef(null);
  const [valor, setValor] = useState(hasta);
  const [visto, setVisto] = useState(false);

  useEffect(() => {
    if (!reducirMovimiento()) setValor(0);
  }, []);

  useAlVerse(ref, setVisto);

  useEffect(() => {
    if (reducirMovimiento()) return setValor(hasta);
    if (!visto) return;
    let frame;
    const inicio = performance.now();
    const paso = (ahora) => {
      const t = Math.min((ahora - inicio) / duracion, 1);
      // Empieza rápido y frena al final.
      setValor(Math.round(hasta * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(paso);
    };
    frame = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(frame);
  }, [visto, hasta, duracion]);

  return (
    <span ref={ref}>
      {antes}
      {valor}
      {despues}
    </span>
  );
}

// Bloque que aparece con un fundido hacia arriba al llegar a él.
// Lo que ya está en pantalla al cargar no se esconde (no parpadea).
export function Aparecer({ children, className = '', retraso = 0 }) {
  const ref = useRef(null);
  const [estado, setEstado] = useState('visible');

  useEffect(() => {
    const el = ref.current;
    if (!el || reducirMovimiento()) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return;
    setEstado('oculto');
  }, []);

  useAlVerse(ref, () => setEstado((e) => (e === 'oculto' ? 'entrando' : e)));

  const oculto = estado === 'oculto';
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${oculto ? 'translate-y-8 opacity-0' : 'translate-y-0 opacity-100'} ${className}`}
      style={{ transitionDelay: estado === 'entrando' ? `${retraso}ms` : '0ms' }}
    >
      {children}
    </div>
  );
}

// Brillo que sigue al ratón dentro de una tarjeta ("Spotlight Card").
// Uso: const foco = useFoco(); <div {...foco.props} className="relative ...">
//      <Foco color="204,255,0" /> ... </div>
export function useFoco() {
  return {
    props: {
      onMouseMove: (e) => {
        const r = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty('--foco-x', `${e.clientX - r.left}px`);
        e.currentTarget.style.setProperty('--foco-y', `${e.clientY - r.top}px`);
      },
    },
  };
}

export function Foco({ color }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      style={{
        background: `radial-gradient(280px circle at var(--foco-x, 50%) var(--foco-y, 50%), rgba(${color},0.13), transparent 70%)`,
      }}
    />
  );
}
