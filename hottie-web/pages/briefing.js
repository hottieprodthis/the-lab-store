import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function BriefingUnificadoPage() {
  const router = useRouter();
  const { session_id } = router.query;
  const [loading, setLoading] = useState(false);
  const [tipoCompra, setTipoCompra] = useState('clase'); // 'clase', 'servicio' o 'mixto'

  // Estados para el formulario de Clases
  const [claseData, setClaseData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    estilo: '',
    detalles: '',
    tipo: 'clase'
  });

  // Estados para el formulario de Servicios
  const [servicioData, setServicioData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    estilo: '',
    detalles: '',
    tipo: 'servicio'
  });

  // Opcional: Podríamos detectar por Stripe session qué se compró si fuera necesario, 
  // pero para hacerlo robusto permitiremos mostrar ambos si se indica o por defecto según la ruta.
  useEffect(() => {
    // Si estás reutilizando esta página tanto para clases, servicios o ambos,
    // puedes pasar un parámetro en la URL o detectarlo aquí. 
    // Por ejemplo, si la ruta viene de servicios, o si es mixto.
    if (router.pathname.includes('servicios')) {
      setTipoCompra('servicio');
    }
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Si es mixto, enviamos ambos formularios a la API
      if (tipoCompra === 'mixto') {
        await fetch('/api/guardar-briefing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(claseData),
        });

        const resServicio = await fetch('/api/guardar-briefing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(servicioData),
        });

        if (resServicio.ok) {
          router.push('/gracias?tipo=mixto');
        } else {
          alert('Hubo un problema al enviar los formularios. Inténtalo de nuevo.');
        }
      } else {
        // Envío normal individual
        const dataToSend = tipoCompra === 'servicio' ? servicioData : claseData;
        const res = await fetch('/api/guardar-briefing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataToSend),
        });

        if (res.ok) {
          router.push(`/gracias?tipo=${tipoCompra}`);
        } else {
          alert('Hubo un problema al enviar el formulario. Inténtalo de nuevo.');
        }
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

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
            Completa la información necesaria para que podamos ponernos manos a la obra con tus artículos.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          
          {/* BLOQUE DE CLASES (Se muestra si es clase o mixto) */}
          {(tipoCompra === 'clase' || tipoCompra === 'mixto') && (
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
                    onChange={(e) => setClaseData({...claseData, nombre: e.target.value})}
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
                    onChange={(e) => setClaseData({...claseData, email: e.target.value})}
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
                    onChange={(e) => setClaseData({...claseData, telefono: e.target.value})}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#ccc' }}>
                    Estilo musical a trabajar en la clase *
                  </label>
                  <input 
                    type="text" 
                    required
                    placeholder="Ej. Trap, Reggaeton..."
                    value={claseData.estilo}
                    onChange={(e) => setClaseData({...claseData, estilo: e.target.value})}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#ccc' }}>
                    Detalles adicionales o nivel para la clase
                  </label>
                  <textarea 
                    rows="3"
                    placeholder="DAW que usas, dudas específicas..."
                    value={claseData.detalles}
                    onChange={(e) => setClaseData({...claseData, detalles: e.target.value})}
                    style={{ ...inputStyle, resize: 'vertical' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* SEPARADOR SI ES MIXTO */}
          {tipoCompra === 'mixto' && (
            <div style={{ borderBottom: '2px dashed #27272a', margin: '10px 0' }}></div>
          )}

          {/* BLOQUE DE SERVICIOS (Se muestra si es servicio o mixto) */}
          {(tipoCompra === 'servicio' || tipoCompra === 'mixto') && (
            <div style={{ border: '1px solid #27272a', padding: '20px', borderRadius: '8px', backgroundColor: '#09090b' }}>
              <h2 style={{ fontSize: '1.2rem', color: '#cbfe00', marginBottom: '15px', textTransform: 'uppercase' }}>
                Formulario para tu Servicio de Estudio
              </h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#ccc' }}>
                    Nombre del Proyecto / Artista *
                  </label>
                  <input 
                    type="text" 
                    required
                    placeholder="Nombre para el proyecto"
                    value={servicioData.nombre}
                    onChange={(e) => setServicioData({...servicioData, nombre: e.target.value})}
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
                    onChange={(e) => setServicioData({...servicioData, email: e.target.value})}
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
                    onChange={(e) => setServicioData({...servicioData, telefono: e.target.value})}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#ccc' }}>
                    Género / Estilo del servicio *
                  </label>
                  <input 
                    type="text" 
                    required
                    placeholder="Ej. R&B, Hip Hop..."
                    value={servicioData.estilo}
                    onChange={(e) => setServicioData({...servicioData, estilo: e.target.value})}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#ccc' }}>
                    Enlace a losarchivos / multitrack / referencias (Drive, Dropbox...) *
                  </label>
                  <textarea 
                    rows="3"
                    placeholder="Pega aquí tu enlace de descarga o notas importantes..."
                    value={servicioData.detalles}
                    onChange={(e) => setServicioData({...servicioData, detalles: e.target.value})}
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
