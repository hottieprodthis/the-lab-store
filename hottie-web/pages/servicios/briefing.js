import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import SeguimientoForm, { SEGUIMIENTO_INICIAL } from '../../components/SeguimientoForm';
import { errorEnlacesBriefing, primerError } from '../../lib/enlacesSeguros';
import { EsqueletoFormulario } from '../../components/Esqueleto';
import { usePagoBriefing, SinPagoBriefing } from '../../components/PagoBriefing';

export default function BriefingPage() {
  const router = useRouter();
  // Solo con el justificante de un pago (components/PagoBriefing.js).
  const pago = usePagoBriefing('servicio');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    estilo: '',
    enlaceDemo: '',
    tieneStems: false,
    detalles: ''
  });

  // Datos del formulario de SEGUIMIENTO (solo se usa si la URL trae
  // seg=solo o seg=con; ver pages/api/checkout.js).
  const [segData, setSegData] = useState(SEGUIMIENTO_INICIAL);
  const seg = typeof router.query.seg === 'string' ? router.query.seg : '';
  const mostrarSeguimiento = seg === 'solo' || seg === 'con';
  const mostrarServicio = seg !== 'solo';

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Enlaces solo de plataformas seguras (lib/enlacesSeguros.js).
    const errorEnlaces = errorEnlacesBriefing({
      demo: mostrarServicio ? formData.enlaceDemo : '',
      proyectos: mostrarSeguimiento ? segData.enlacesProyectos : null,
    });
    if (errorEnlaces) {
      alert(errorEnlaces);
      return;
    }
    setLoading(true);

    try {
      const peticiones = [];
      if (mostrarSeguimiento) {
        peticiones.push(
          fetch('/api/guardar-briefing', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...segData, tipo: 'seguimiento', ...pago.ref }),
          })
        );
      }
      if (mostrarServicio) {
        peticiones.push(
          fetch('/api/guardar-briefing', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...formData, ...pago.ref }),
          })
        );
      }
      const respuestas = await Promise.all(peticiones);

      if (respuestas.every((r) => r.ok)) {
        // Redirige a la página de agradecimientos tras enviar los datos
        router.push('/gracias?tipo=servicio');
      } else {
        alert(await primerError(respuestas));
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // Esperamos a que el router conozca la URL para no enseñar un instante el
  // formulario equivocado.
  if (!router.isReady || pago.estado === 'comprobando') {
    return <EsqueletoFormulario />;
  }
  if (pago.estado === 'no') return <SinPagoBriefing />;

  return (
    <>
      <Head>
        <title>Detalles del Servicio | THE LAB</title>
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
            Completa la información de tu proyecto para empezar a trabajar de inmediato.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {mostrarSeguimiento && (
            <div style={seg === 'con' ? bloqueStyle : undefined}>
              {seg === 'con' && <h2 style={tituloBloqueStyle}>Formulario para tu Seguimiento</h2>}
              <SeguimientoForm data={segData} setData={setSegData} prefijo="seg" />
            </div>
          )}

          {seg === 'con' && <div style={{ borderBottom: '2px dashed #27272a', margin: '10px 0' }}></div>}

          {mostrarServicio && (
            <div
              style={
                seg === 'con'
                  ? { ...bloqueStyle, display: 'flex', flexDirection: 'column', gap: '20px' }
                  : { display: 'flex', flexDirection: 'column', gap: '20px' }
              }
            >
              {seg === 'con' && <h2 style={tituloBloqueStyle}>Formulario para tu Servicio de Estudio</h2>}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#ccc' }}>
              Nombre y Apellidos / Nombre Artístico *
            </label>
            <input 
              type="text" 
              required
              placeholder="Ej. Hottie / Juan Pérez"
              value={formData.nombre}
              onChange={(e) => setFormData({...formData, nombre: e.target.value})}
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
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
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
              value={formData.telefono}
              onChange={(e) => setFormData({...formData, telefono: e.target.value})}
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
              value={formData.estilo}
              onChange={(e) => setFormData({...formData, estilo: e.target.value})}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#ccc' }}>
              Enlace a la Demo / Maqueta <span style={{ color: '#71717a', fontWeight: 'normal' }}>(opcional)</span>
                  </label>
            <input 
              type="url" 
              placeholder="Google Drive, Dropbox, WeTransfer, SoundCloud..."
              value={formData.enlaceDemo}
              onChange={(e) => setFormData({...formData, enlaceDemo: e.target.value})}
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
              checked={formData.tieneStems}
              onChange={(e) => setFormData({...formData, tieneStems: e.target.checked})}
              style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#cbfe00' }}
            />
            <label htmlFor="stems" style={{ cursor: 'pointer', fontSize: '0.95rem' }}>
              Tengo los Stems / Pistas por separado listos para enviar
            </label>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#ccc' }}>
              Detalles adicionales, gustos, preferencias o referencias <span style={{ color: '#71717a', fontWeight: 'normal' }}>(opcional)</span>
                  </label>
            <textarea 
              rows="4"
              placeholder="Escribe aquí cualquier nota importante sobre la mezcla, estructura, referencias de otros artistas..."
              value={formData.detalles}
              onChange={(e) => setFormData({...formData, detalles: e.target.value})}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>
            </div>
          )}

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
            {loading ? 'ENVIANDO INFORMACIÓN...' : 'COMPLETAR RESERVA'}
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

const bloqueStyle = {
  border: '1px solid #27272a',
  padding: '20px',
  borderRadius: '8px',
  backgroundColor: '#09090b',
};

const tituloBloqueStyle = {
  fontSize: '1.2rem',
  color: '#cbfe00',
  marginBottom: '15px',
  textTransform: 'uppercase',
};

// Con la web en obras o en "solo portada y contacto" (panel) esta página se
// tapa con el aviso de obras (lib/obras.js).
export async function getServerSideProps({ res }) {
  const { supabase } = await import('../../lib/supabaseClient');
  const { propsSegunObras } = await import('../../lib/obras');
  return propsSegunObras(supabase, res, 'general');
}
