import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Navbar from '../../../components/Navbar';
import Footer from '../../../components/Footer';
import { supabase } from '../../../lib/supabaseClient';

export default function AdminSuscriptores() {
  const [suscriptores, setSuscriptores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [emailNuevo, setEmailNuevo] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  // Cargar lista de suscriptores
  const cargarSuscriptores = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('suscriptores')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error al obtener suscriptores:', error);
    } else {
      setSuscriptores(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    cargarSuscriptores();
  }, []);

  // Añadir suscriptor manualmente
  const handleAddSubscriber = async (e) => {
    e.preventDefault();
    if (!emailNuevo) return;

    setGuardando(true);
    setMensaje({ tipo: '', texto: '' });

    try {
      const emailLimpio = emailNuevo.trim().toLowerCase();

      // Comprobar si ya existe
      const { data: existente } = await supabase
        .from('suscriptores')
        .select('email')
        .eq('email', emailLimpio)
        .maybeSingle();

      if (existente) {
        setMensaje({ tipo: 'error', texto: 'Este correo ya está registrado.' });
        setGuardando(false);
        return;
      }

      // Insertar nuevo suscriptor
      const { error } = await supabase
        .from('suscriptores')
        .insert([{ email: emailLimpio }]);

      if (error) {
        setMensaje({ tipo: 'error', texto: 'Error al añadir el suscriptor.' });
      } else {
        setMensaje({ tipo: 'exito', texto: '¡Suscriptor añadido!' });
        setEmailNuevo('');
        cargarSuscriptores();
      }
    } catch (err) {
      setMensaje({ tipo: 'error', texto: 'Ocurrió un error inesperado.' });
    } finally {
      setGuardando(false);
    }
  };

  // Eliminar suscriptor
  const handleDeleteSubscriber = async (id, email) => {
    if (!confirm(`¿Seguro que quieres eliminar a ${email}?`)) return;

    const { error } = await supabase
      .from('suscriptores')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Error al eliminar suscriptor.');
    } else {
      cargarSuscriptores();
    }
  };

  return (
    <>
      <Head>
        <title>Suscriptores | Admin - The Lab</title>
      </Head>

      <Navbar />

      <main className="mx-auto max-w-4xl px-5 py-20 font-body">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-wide text-paper uppercase">
              Suscriptores
            </h1>
            <p className="text-sm text-muted">
              Total registrados: {suscriptores.length}
            </p>
          </div>

          <Link
            href="/admin"
            className="text-sm font-semibold text-volt hover:underline"
          >
            ← Volver al Panel Admin
          </Link>
        </div>

        {/* FORMULARIO PARA AÑADIR MANUALMENTE */}
        <div className="mb-8 rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <h2 className="text-lg font-semibold text-paper mb-4">
            Añadir Suscriptor Manualmente
          </h2>
          <form onSubmit={handleAddSubscriber} className="flex gap-3">
            <input
              type="email"
              required
              placeholder="correo@ejemplo.com"
              value={emailNuevo}
              onChange={(e) => setEmailNuevo(e.target.value)}
              className="w-full rounded-md border border-white/20 bg-ink px-4 py-2 text-sm text-paper placeholder-muted focus:border-volt focus:outline-none transition"
            />
            <button
              type="submit"
              disabled={guardando}
              className="rounded-md bg-volt px-5 py-2 text-sm font-bold uppercase text-ink transition hover:bg-signal disabled:opacity-50 whitespace-nowrap"
            >
              {guardando ? 'Guardando...' : 'Añadir'}
            </button>
          </form>

          {mensaje.texto && (
            <p
              className={`mt-3 text-xs font-semibold ${
                mensaje.tipo === 'exito' ? 'text-volt' : 'text-red-400'
              }`}
            >
              {mensaje.texto}
            </p>
          )}
        </div>

        {/* TABLA DE SUSCRIPTORES */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          {loading ? (
            <p className="text-center text-sm text-muted py-8">
              Cargando suscriptores...
            </p>
          ) : suscriptores.length === 0 ? (
            <p className="text-center text-sm text-muted py-8">
              No hay suscriptores aún.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-paper">
                <thead className="border-b border-white/10 text-xs uppercase text-muted">
                  <tr>
                    <th className="pb-3 font-semibold">Email</th>
                    <th className="pb-3 font-semibold text-center">Fecha</th>
                    <th className="pb-3 font-semibold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {suscriptores.map((s) => (
                    <tr key={s.id || s.email}>
                      <td className="py-3 font-medium">{s.email}</td>
                      <td className="py-3 text-center text-muted text-xs">
                        {s.created_at
                          ? new Date(s.created_at).toLocaleDateString()
                          : '-'}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => handleDeleteSubscriber(s.id, s.email)}
                          className="rounded bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
