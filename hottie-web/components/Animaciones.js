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
export function Contador({ hasta, antes = '', despues = '', duracion = 2000 }) {
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

// Fondo de ondas verdes muy suaves (tipo onda de audio) para la portada. Va
// detrás del contenido y no se mueve si se ha pedido "reducir movimiento".
export function FondoOndas() {
  const onda = (amplitud, periodo) => {
    let d = 'M0 100';
    for (let x = 0; x <= 2400; x += periodo / 2) {
      const arriba = (x / (periodo / 2)) % 2 === 0;
      d += ` Q${x + periodo / 4} ${arriba ? 100 - amplitud : 100 + amplitud} ${x + periodo / 2} 100`;
    }
    return d;
  };
  const lineas = [
    { a: 38, p: 300, o: 0.18, dur: 26, ancho: 1.5 },
    { a: 24, p: 240, o: 0.12, dur: 34, ancho: 1 },
    { a: 54, p: 400, o: 0.08, dur: 42, ancho: 1 },
  ];
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-0 overflow-hidden">
      <svg className="absolute left-0 top-1/2 h-[60%] w-[200%] -translate-y-1/2" viewBox="0 0 2400 200" preserveAspectRatio="none">
        {lineas.map((l, i) => (
          <path
            key={i}
            d={onda(l.a, l.p)}
            fill="none"
            stroke="#CCFF00"
            strokeOpacity={l.o}
            strokeWidth={l.ancho}
            vectorEffect="non-scaling-stroke"
            className="fondo-onda"
            style={{ animationDuration: `${l.dur}s` }}
          />
        ))}
      </svg>
    </div>
  );
}

// Botón redondo para volver arriba; aparece al bajar bastante. Va abajo a la
// izquierda para no chocar con el carrito.
export function VolverArriba({ encima = false }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const alBajar = () => setVisible(window.scrollY > 900);
    alBajar();
    window.addEventListener('scroll', alBajar, { passive: true });
    return () => window.removeEventListener('scroll', alBajar);
  }, []);
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: reducirMovimiento() ? 'auto' : 'smooth' })}
      aria-label="Volver arriba"
      tabIndex={visible ? 0 : -1}
      className={`fixed ${encima ? 'bottom-20' : 'bottom-6'} left-6 z-30 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-ink/80 text-paper backdrop-blur transition-all duration-300 hover:border-volt hover:text-volt ${
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'
      }`}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
    </button>
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

export function Foco({ color, fuerza = 0.13 }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      style={{
        background: `radial-gradient(280px circle at var(--foco-x, 50%) var(--foco-y, 50%), rgba(${color},${fuerza}), transparent 70%)`,
      }}
    />
  );
}
