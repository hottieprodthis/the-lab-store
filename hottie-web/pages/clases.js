import Head from 'next/head';
import { useState } from 'react';

const PLANES_CLASES = [
  {
    id: 'clase-individual',
    nombre: 'Clase Individual (1h)',
    precio: '45€',
    descripcion: 'Sesión intensiva 1 a 1 para resolver dudas puntuales de mezcla, producción o composición.',
    caracteristicas: ['1 Hora en directo', 'Feedback de tu proyecto', 'Grabación de la clase'],
  },
  {
    id: 'pack-4-clases',
    nombre: 'Pack 4 Clases (4h)',
    precio: '160€',
    descripcion: 'Programa personalizado paso a paso para llevar tus producciones al nivel profesional.',
    caracteristicas: ['4 Horas programables', 'Soporte por WhatsApp / Discord', 'Plantillas de trabajo gratis'],
  },
];

export default function Clases() {
  const [claseSeleccionada, setClaseSeleccionada] = useState(null);

  return (
    <>
      <Head>
        <title>Clases | The Lab - Hottie</title>
      </Head>
      
      {/* Añadimos pt-32 para que el menú superior no tape el título */}
      <div className="max-w-7xl mx-auto px-4 py-12 text-white pt-32">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-display mb-4 tracking-wider">CLASES 1 A 1</h1>
          <p className="text-gray-400 max-w-2xl mx-auto font-body">
            Aprende producción musical, mezcla y masterización con sesiones personalizadas por reserva.
          </p>
        </div>

        {/* Tarjetas de Clases */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {PLANES_CLASES.map((clase) => (
            <div
              key={clase.id}
              className="border border-gray-800 bg-black/50 p-8 rounded-xl flex flex-col justify-between hover:border-yellow-400/50 transition-colors"
            >
              <div>
                <h2 className="text-3xl font-display mb-2">{clase.nombre}</h2>
                <div className="text-3xl font-bold text-yellow-400 mb-4">{clase.precio}</div>
                <p className="text-gray-300 mb-6 font-body">{clase.descripcion}</p>
                <ul className="space-y-2 mb-8">
                  {clase.caracteristicas.map((item, idx) => (
                    <li key={idx} className="flex items-center text-sm text-gray-400 font-body">
                      <span className="text-yellow-400 mr-3 text-lg">✓</span> {item}
                    </li>
                  ))}
                </ul>
              </div>
              <button
                onClick={() => setClaseSeleccionada(clase)}
                className="w-full py-4 bg-yellow-400 text-black font-display text-xl tracking-wider rounded hover:bg-yellow-300 transition-colors"
              >
                Reservar Clase
              </button>
            </div>
          ))}
        </div>

        {/* Modal (Ventana emergente) de Reserva */}
        {claseSeleccionada && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50">
            <div className="bg-[#0a0a0a] border border-gray-800 p-8 rounded-xl max-w-md w-full relative">
              <button
                onClick={() => setClaseSeleccionada(null)}
                className="absolute top-4 right-4 text-gray-500 hover:text-white text-2xl font-bold"
              >
                ✕
              </button>
              <h3 className="text-3xl font-display mb-2 text-white">Reservar:<br/>{claseSeleccionada.nombre}</h3>
              <p className="text-sm text-gray-400 mb-8 font-body">
                Elige tu disponibilidad para agendar la sesión.
              </p>

              <div className="space-y-4">
                <a
                  href={`/contacto?reserva=${claseSeleccionada.id}`}
                  className="block text-center w-full py-4 bg-yellow-400 text-black font-display text-xl tracking-wider rounded hover:bg-yellow-300 transition-colors"
                >
                  Solicitar Fecha por Contacto
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
