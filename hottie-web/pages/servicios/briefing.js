import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function BriefingPage() {
  const router = useRouter();
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
        // Redirige a la página de agradecimientos tras enviar los datos
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
              Enlace a la Demo / Maqueta
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
              Detalles adicionales, gustos, preferencias o referencias
            </label>
            <textarea 
              rows="4"
              placeholder="Escribe aquí cualquier nota importante sobre la mezcla, estructura, referencias de otros artistas..."
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
