// Campos del formulario de SEGUIMIENTO que se enseña después de pagar un
// servicio con el tipo de cupo "Seguimiento". Lo usan pages/servicios/
// briefing.js y pages/briefing.js, así que el formulario es idéntico en las
// dos. Todos los campos son obligatorios; no pide demo, stems ni detalles.
export const SEGUIMIENTO_INICIAL = {
  nombre: '',
  email: '',
  telefono: '',
  estilo: '',
  modalidad: '', // 'mezcla_master' | 'produccion'
  enlacesProyectos: '',
  plugins: '',
};

const etiqueta = { display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#ccc' };

const estiloCampo = {
  width: '100%',
  padding: '12px 14px',
  backgroundColor: '#121212',
  border: '1px solid #27272a',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '0.95rem',
  outline: 'none',
  boxSizing: 'border-box',
};

const OPCIONES = [
  { valor: 'mezcla_master', texto: 'Mezcla y master' },
  { valor: 'produccion', texto: 'Producción' },
];

export default function SeguimientoForm({ data, setData, prefijo = 'seg' }) {
  const cambiar = (campo) => (e) => setData({ ...data, [campo]: e.target.value });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      <div>
        <label style={etiqueta}>Nombre y Apellidos / Nombre Artístico *</label>
        <input
          type="text"
          required
          placeholder="Ej. Hottie / Juan Pérez"
          value={data.nombre}
          onChange={cambiar('nombre')}
          style={estiloCampo}
        />
      </div>

      <div>
        <label style={etiqueta}>Email de contacto *</label>
        <input
          type="email"
          required
          placeholder="tu@email.com"
          value={data.email}
          onChange={cambiar('email')}
          style={estiloCampo}
        />
      </div>

      <div>
        <label style={etiqueta}>Teléfono / WhatsApp *</label>
        <input
          type="tel"
          required
          placeholder="+34 600 000 000"
          value={data.telefono}
          onChange={cambiar('telefono')}
          style={estiloCampo}
        />
      </div>

      <div>
        <label style={etiqueta}>Estilo musical a trabajar *</label>
        <input
          type="text"
          required
          placeholder="Ej. Trap, Reggaeton, Boom Bap, Pop..."
          value={data.estilo}
          onChange={cambiar('estilo')}
          style={estiloCampo}
        />
      </div>

      <div>
        <span style={etiqueta}>¿Qué quieres trabajar en el seguimiento? * (elige una)</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          {OPCIONES.map((op) => {
            const id = `${prefijo}-${op.valor}`;
            return (
              <label
                key={op.valor}
                htmlFor={id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  backgroundColor: '#121212',
                  padding: '12px 16px',
                  borderRadius: '6px',
                  border: `1px solid ${data.modalidad === op.valor ? '#cbfe00' : '#27272a'}`,
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                }}
              >
                <input
                  type="radio"
                  id={id}
                  name={`${prefijo}-modalidad`}
                  value={op.valor}
                  required
                  checked={data.modalidad === op.valor}
                  onChange={() => setData({ ...data, modalidad: op.valor })}
                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#cbfe00' }}
                />
                {op.texto}
              </label>
            );
          })}
        </div>
      </div>

      <div>
        <label style={etiqueta}>Enlaces a tus proyectos más recientes *</label>
        <textarea
          rows="3"
          required
          placeholder="Pega aquí los enlaces (SoundCloud, YouTube, Spotify, Drive...), uno por línea"
          value={data.enlacesProyectos}
          onChange={cambiar('enlacesProyectos')}
          style={{ ...estiloCampo, resize: 'vertical' }}
        />
      </div>

      <div>
        <label style={etiqueta}>Plugins que usas mayoritariamente *</label>
        <textarea
          rows="3"
          required
          placeholder="Ej. FabFilter Pro-Q 3, Serum, Soundtoys, Waves..."
          value={data.plugins}
          onChange={cambiar('plugins')}
          style={{ ...estiloCampo, resize: 'vertical' }}
        />
      </div>
    </div>
  );
}
