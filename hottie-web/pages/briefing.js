import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function BriefingClasesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    estilo: '',
    detalles: '',
    tipo: 'clase'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/guardar-briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        router.push('/gracias?tipo=servicio');
      } else {
        alert('Hubo un problema al enviar el formulario. Inténtalo de nuevo.');
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
        <title>Detalles de la Clase | THE LAB</title>
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
            Completa la información sobre tus datos y objetivos para agendar tu sesión 1 a 1.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
              Detalles adicionales, nivel, software que usas u objetivos para la clase
            </label>
            <textarea 
              rows="4"
              placeholder="Escribe aquí tu DAW (FL Studio, Ableton, Logic...), temas específicos a tratar, dudas o tu disponibilidad horaria..."
              value={formData.detalles}
              onChange={(e) => setFormData({...formData, detalles: e.target.value})}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

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
