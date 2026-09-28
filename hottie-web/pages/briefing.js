import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

// Página de briefing COMBINADO: se usa cuando un mismo pedido mezcla
// dos o más categorías (producto+servicio, producto+clase,
// servicio+clase, o producto+servicio+clase). Los productos nunca
// necesitan briefing, así que aquí solo se muestran los bloques de
// Servicio y/o Clase que correspondan, y da igual el orden en que se
// añadieron al carrito: lo único que importa es qué categorías
// contiene el "tipo" recibido por la URL.
export default function BriefingUnificadoPage() {
  const router = useRouter();
  const { tipo, session_id } = router.query;
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [hasServicio, setHasServicio] = useState(false);
  const [hasClase, setHasClase] = useState(false);

  // Estados para el formulario de Clases (mismos campos que
  // pages/clases/briefing.js, incluido "nivel").
  const [claseData, setClaseData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    estilo: '',
    nivel: '',
    detalles: '',
    tipo: 'clase',
  });

  // Estados para el formulario de Servicios (mismos campos que
  // pages/servicios/briefing.js).
  const [servicioData, setServicioData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    estilo: '',
    enlaceDemo: '',
    tieneStems: false,
    detalles: '',
  });

  useEffect(() => {
    if (!router.isReady) return;
    const tipoStr = typeof tipo === 'string' ? tipo : '';
    setHasServicio(tipoStr.includes('servicio'));
    setHasClase(tipoStr.includes('clase'));
    setReady(true);
  }, [router.isReady, tipo]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const peticiones = [];

      if (hasClase) {
        peticiones.push(
          fetch('/api/guardar-briefing', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(claseData),
          })
        );
      }

      if (hasServicio) {
        peticiones.push(
          fetch('/api/guardar-briefing', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...servicioData, tipo: 'servicio' }),
          })
        );
      }

      const respuestas = await Promise.all(peticiones);
      const todoOk = respuestas.every((r) => r.ok);

      if (todoOk) {
        const tipoFinal = typeof tipo === 'string' && tipo ? tipo : 'mixto';
        const query = session_id
          ? `/gracias?tipo=${tipoFinal}&session_id=${session_id}`
          : `/gracias?tipo=${tipoFinal}`;
        router.push(query);
      } else {
        alert('Hubo un problema al enviar los formularios. Inténtalo de nuevo.');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (!ready) {
    return (
      <div style={{ maxWidth: '650px', margin: '60px auto', padding: '30px 20px', color: '#ffffff' }}>
        <p style={{ color: '#a1a1aa' }}>Cargando…</p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Detalles del Pedido | THE LAB</title>
      </Head>
      <div style={{
        maxWidth: '650px',
        margin: '60px auto',
        padding: '30px 20px',
        color: '#ffffff',
        fontFamily: 'sans-serif'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ fontSize: '2rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
            ¡Pago Confirmado!
          </h1>
          <p style={{ color: '#a1a1aa', marginTop: '10px' }}>
            Tu pedido incluye más de un tipo de artículo. Completa la información necesaria para que podamos ponernos manos a la obra.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>

          {/* BLOQUE DE CLASES */}
          {hasClase && (
            <div style={{ border: '1px solid #27272a', padding: '20px', borderRadius: '8px', backgroundColor: '#09090b' }}>
              <h2 style={{ fontSize: '1.2rem', color: '#cbfe00', marginBottom: '15px', textTransform: 'uppercase' }}>
                Formulario para tu Clase 1 a 1
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#ccc' }}>
                    Nombre y Apellidos / Nombre Artístico *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Hottie / Juan Pérez"
                    value={claseData.nombre}
                    onChange={(e) => setClaseData({ ...claseData, nombre: e.target.value })}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#ccc' }}>
                    Email de contacto *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="tu@email.com"
                    value={claseData.email}
                    onChange={(e) => setClaseData({ ...claseData, email: e.target.value })}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#ccc' }}>
                    Teléfono / WhatsApp *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+34 600 000 000"
                    value={claseData.telefono}
                    onChange={(e) => setClaseData({ ...claseData, telefono: e.target.value })}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#ccc' }}>
                    Estilo musical a trabajar *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Trap, Reggaeton, Boom Bap, Pop..."
                    value={claseData.estilo}
                    onChange={(e) => setClaseData({ ...claseData, estilo: e.target.value })}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#ccc' }}>
                    Nivel de experiencia *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Principiante, Intermedio, Avanzado..."
                    value={claseData.nivel}
                    onChange={(e) => setClaseData({ ...claseData, nivel: e.target.value })}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#ccc' }}>
                    Detalles adicionales u objetivos para la clase
                  </label>
                  <textarea
                    rows="3"
                    placeholder="Escribe aquí cualquier nota sobre los puntos o temas específicos que te gustaría aprender o mejorar..."
                    value={claseData.detalles}
                    onChange={(e) => setClaseData({ ...claseData, detalles: e.target.value })}
                    style={{ ...inputStyle, resize: 'vertical' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* SEPARADOR SI HAY AMBOS BLOQUES */}
          {hasClase && hasServicio && (
            <div style={{ borderBottom: '2px dashed #27272a', margin: '10px 0' }}></div>
          )}

          {/* BLOQUE DE SERVICIOS */}
          {hasServicio && (
            <div style={{ border: '1px solid #27272a', padding: '20px', borderRadius: '8px', backgroundColor: '#09090b' }}>
              <h2 style={{ fontSize: '1.2rem', color: '#cbfe00', marginBottom: '15px', textTransform: 'uppercase' }}>
                Formulario para tu Servicio de Estudio
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#ccc' }}>
                    Nombre y Apellidos / Nombre Artístico *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Hottie / Juan Pérez"
                    value={servicioData.nombre}
                    onChange={(e) => setServicioData({ ...servicioData, nombre: e.target.value })}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#ccc' }}>
                    Email de contacto *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="tu@email.com"
                    value={servicioData.email}
                    onChange={(e) => setServicioData({ ...servicioData, email: e.target.value })}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#ccc' }}>
                    Teléfono / WhatsApp *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+34 600 000 000"
                    value={servicioData.telefono}
                    onChange={(e) => setServicioData({ ...servicioData, telefono: e.target.value })}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#ccc' }}>
                    Estilo musical a trabajar *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Trap, Reggaeton, Boom Bap, Pop..."
                    value={servicioData.estilo}
                    onChange={(e) => setServicioData({ ...servicioData, estilo: e.target.value })}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#ccc' }}>
                    Enlace a la Demo / Maqueta
                  </label>
                  <input
                    type="url"
                    placeholder="Google Drive, Dropbox, WeTransfer, SoundCloud..."
                    value={servicioData.enlaceDemo}
                    onChange={(e) => setServicioData({ ...servicioData, enlaceDemo: e.target.value })}
                    style={inputStyle}
                  />
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  backgroundColor: '#121212',
                  padding: '15px',
                  borderRadius: '6px',
                  border: '1px solid #27272a'
                }}>
                  <input
                    type="checkbox"
                    id="stems"
                    checked={servicioData.tieneStems}
                    onChange={(e) => setServicioData({ ...servicioData, tieneStems: e.target.checked })}
                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#cbfe00' }}
                  />
                  <label htmlFor="stems" style={{ cursor: 'pointer', fontSize: '0.95rem' }}>
                    Tengo los Stems / Pistas por separado listos para enviar
                  </label>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#ccc' }}>
                    Detalles adicionales, gustos, preferencias o referencias
                  </label>
                  <textarea
                    rows="3"
                    placeholder="Escribe aquí cualquier nota importante sobre la mezcla, estructura, referencias de otros artistas..."
                    value={servicioData.detalles}
                    onChange={(e) => setServicioData({ ...servicioData, detalles: e.target.value })}
                    style={{ ...inputStyle, resize: 'vertical' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ÚNICO BOTÓN AL FINAL DEL TODO */}
          <button
            type="submit"
            disabled={loading}
            style={{
              backgroundColor: '#cbfe00',
              color: '#000000',
              padding: '16px',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 'bold',
              fontSize: '1rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '10px',
              letterSpacing: '1px',
              textTransform: 'uppercase'
            }}
          >
            {loading ? 'ENVIANDO INFORMACIÓN...' : 'COMPLETAR RESERVA Y ENVÍO'}
          </button>
        </form>
      </div>
    </>
  );
}

const inputStyle = {
  width: '100%',
  padding: '12px 14px',
  backgroundColor: '#121212',
  border: '1px solid #27272a',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '0.95rem',
  outline: 'none',
  boxSizing: 'border-box'
};
