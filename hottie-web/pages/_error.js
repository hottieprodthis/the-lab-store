import PaginaError from '../components/PaginaError';

// Cualquier otro fallo que no sea "no encontrada" (pages/404.js) ni del
// servidor (pages/500.js): por ejemplo, si algo se rompe ya en el navegador.
// Sustituye a la pantalla blanca de Next.js ("Application error").
function Error({ statusCode }) {
  return (
    <PaginaError
      codigo={statusCode ? String(statusCode) : ''}
      titulo="Algo ha fallado"
      texto="Esta página no ha podido cargarse bien. Vuelve a intentarlo y, si sigue pasando, avísanos para que lo arreglemos."
    />
  );
}

Error.getInitialProps = ({ res, err }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default Error;
