import PaginaError from '../components/PaginaError';

// Fallo del servidor (antes salía la pantalla de Next.js, en inglés).
export default function ErrorServidor() {
  return (
    <PaginaError
      codigo="500"
      titulo="Algo ha fallado"
      texto="Ha habido un problema en el laboratorio al cargar esta página. No es culpa tuya: vuelve a intentarlo en unos segundos y, si sigue pasando, avísanos."
    />
  );
}
