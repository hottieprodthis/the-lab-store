import Head from 'next/head';
import { useState, useEffect } from 'react';

export default function Clases() {
  const [clases, setClases] = useState([]);
  const [claseSeleccionada, setClaseSeleccionada] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/clases')
      .then((res) => res.json())
      .then((data) => {
        setClases(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <>
      <Head>
        <title>Clases | The Lab - Hottie</title>
      </Head>

      <div className="max-w-7xl mx-auto px-4 py-12 text-paper pt-32">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-display mb-4 tracking-wider text-paper">CLASES 1 A 1</h1>
          <p className="text-muted max-w-2xl mx-auto font-body">
            Aprende producción musical, mezcla y masterización con sesiones personalizadas por reserva.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted font-body">Cargando clases...</div>
        ) : clases.length === 0 ? (
          <div className="text-center py-12 text-muted font-body">
            Próximamente habrá nuevas clases disponibles.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {clases.map((clase) => (
              <div
                key={clase.id || clase._id}
                className="border border-white/10 bg-ink/50 p-8 rounded-xl flex flex-col justify-between hover:border-[#CCFF00]/50 transition-colors"
              >
                <div>
                  <h2 className="text-3xl font-display mb-2 text-paper">{clase.nombre}</h2>
                  <div className="text-3xl font-bold text-[#CCFF00] mb-4">{clase.precio}€</div>
                  <p className="text-paper/80 mb-6 font-body">{clase.descripcion}</p>
                </div>
                <button
                  onClick={() => setClaseSeleccionada(clase)}
                  className="w-full py-4 bg-[#CCFF00] text-black font-display text-xl tracking-wider rounded hover:bg-[#b8e600] transition-colors"
                >
                  Reservar Clase
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Modal de Reserva */}
        {claseSeleccionada && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50">
            <div className="bg-ink border border-white/10 p-8 rounded-xl max-w-md w-full relative">
              <button
                onClick={() => setClaseSeleccionada(null)}
                className="absolute top-4 right-4 text-muted hover:text-paper text-2xl font-bold"
              >
                ✕
              </button>
              <h3 className="text-3xl font-display mb-2 text-paper">
                Reservar:<br />
                {claseSeleccionada.nombre}
              </h3>
              <p className="text-sm text-muted mb-8 font-body">
                Elige tu disponibilidad para agendar la sesión.
              </p>

              <div className="space-y-4">
                <a
                  href={claseSeleccionada.linkPago || `/contacto?reserva=${claseSeleccionada.id}`}
                  className="block text-center w-full py-4 bg-[#CCFF00] text-black font-display text-xl tracking-wider rounded hover:bg-[#b8e600] transition-colors"
                >
                  Reservar Ahora
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
