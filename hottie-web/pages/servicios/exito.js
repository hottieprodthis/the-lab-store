import { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';

export default function ServicioExito() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    estilo: '',
    enlaceDemo: '',
    referenciasNotas: '',
  });
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMensaje(null);

    try {
      const res = await fetch('/api/enviar-pedido', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'datos_servicio_postpago',
          ...formData,
        }),
      });

      if (res.ok) {
        // Redirige a la página de agradecimiento tras enviar los datos
        router.push('/gracias?tipo=servicio');
      } else {
        setMensaje('Hubo un problema al enviar los datos. Inténtalo de nuevo.');
      }
    } catch (err) {
      setMensaje('Error de conexión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Detalles del Proyecto — The Lab</title>
      </Head>

      <Navbar />

      <main className="mx-auto max-w-3xl px-5 py-16">
        <div className="bg-surface p-8 border border-white/10 rounded-sm">
          <div className="inline-block bg-volt/10 text-volt text-xs font-bold uppercase tracking-widest px-3 py-1 mb-4 rounded-sm">
            ¡Pago Confirmado!
          </div>
          <h1 className="font-display text-3xl md:text-4xl text-paper">DATOS DE TU PROYECTO</h1>
          <p className="mt-2 text-muted text-sm">
            Gracias por tu compra. Por favor, completa este formulario con los detalles necesarios para empezar a trabajar en tu servicio.
          </p>

          {mensaje && (
            <div className="mt-4 p-4 text-sm font-semibold bg-red-500/20 text-red-400 border border-red-500/30">
              {mensaje}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="block text-xs uppercase tracking-wider text-muted mb-2">
                  Nombre y Apellidos / Artístico *
                </label>
                <input
                  type="text"
                  name="nombre"
                  required
                  value={formData.nombre}
                  onChange={handleChange}
                  className="w-full bg-ink border border-white/10 px-4 py-3 text-paper focus:border-volt outline-none"
                  placeholder="Ej. Mario / Hottie"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-muted mb-2">Correo Electrónico *</label>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full bg-ink border border-white/10 px-4 py-3 text-paper focus:border-volt outline-none"
                  placeholder="tu@email.com"
                />
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="block text-xs uppercase tracking-wider text-muted mb-2">Teléfono / WhatsApp *</label>
                <input
                  type="tel"
                  name="telefono"
                  required
                  value={formData.telefono}
                  onChange={handleChange}
                  className="w-full bg-ink border border-white/10 px-4 py-3 text-paper focus:border-volt outline-none"
                  placeholder="+34 600 000 000"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-muted mb-2">Estilo Musical *</label>
                <input
                  type="text"
                  name="estilo"
                  required
                  value={formData.estilo}
                  onChange={handleChange}
                  className="w-full bg-ink border border-white/10 px-4 py-3 text-paper focus:border-volt outline-none"
                  placeholder="Ej. Trap, Boombap, Reggaeton, Pop..."
                />
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-muted mb-2">
                Enlace a la maqueta/demo (Drive, Dropbox, Wetransfer, etc.) *
              </label>
              <input
                type="url"
                name="enlaceDemo"
                required
                value={formData.enlaceDemo}
                onChange={handleChange}
                className="w-full bg-ink border border-white/10 px-4 py-3 text-paper focus:border-volt outline-none"
                placeholder="https://drive.google.com/..."
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-muted mb-2">
                Detalles adicionales, gustos, preferencias y referencias
              </label>
              <textarea
                name="referenciasNotas"
                rows="4"
                value={formData.referenciasNotas}
                onChange={handleChange}
                className="w-full bg-ink border border-white/10 px-4 py-3 text-paper focus:border-volt outline-none"
                placeholder="Describe el sonido que buscas, referencias de artistas o canciones, guías de voz, etc."
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-volt text-ink font-bold py-4 uppercase tracking-wider transition hover:brightness-110 disabled:opacity-50"
            >
              {loading ? 'ENVIANDO DATOS...' : 'ENVIAR INFORMACIÓN Y FINALIZAR'}
            </button>
          </form>
        </div>
      </main>

      <Footer />
    </>
  );
}
