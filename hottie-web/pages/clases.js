import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

export default function Clases() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchClasses() {
      try {
        const { data, error } = await supabase
          .from('classes')
          .select('*')
          .eq('active', true)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setClasses(data || []);
      } catch (err) {
        console.error('Error cargando clases:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchClasses();
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col justify-between">
      <Head>
        <title>Clases 1 a 1 — The Lab</title>
      </Head>

      <div>
        {/* Header estático integrado */}
        <header className="border-b border-white/10 px-5 py-4">
          <div className="mx-auto max-w-6xl flex items-center justify-between">
            <div className="flex items-center gap-8">
              <Link href="/" className="font-display text-xl font-bold tracking-wider text-white">
                THE LAB <span className="text-[#CCFF00]">⚗</span>
              </Link>
            </div>
            <nav className="flex items-center gap-6 text-sm font-semibold uppercase tracking-wider">
              <Link href="/tienda" className="hover:text-[#CCFF00] transition-colors">Tienda</Link>
              <Link href="/servicios" className="hover:text-[#CCFF00] transition-colors">Servicios</Link>
              <Link href="/clases" className="text-[#CCFF00]">Clases</Link>
              <Link href="/contacto" className="hover:text-[#CCFF00] transition-colors">Contacto</Link>
              <Link href="/faq" className="hover:text-[#CCFF00] transition-colors">FAQ</Link>
            </nav>
          </div>
        </header>

        {/* Contenido Principal */}
        <main className="mx-auto max-w-6xl px-5 py-12">
          <div className="mb-10">
            <h1 className="font-display text-4xl font-bold uppercase tracking-wide">CLASES 1 A 1</h1>
            <p className="mt-2 text-gray-400">
              Aprende producción musical, mezcla y masterización con sesiones personalizadas por reserva.
            </p>
          </div>

          {loading ? (
            <div className="py-12 text-center text-gray-400">Cargando clases…</div>
          ) : classes.length === 0 ? (
            <p className="text-gray-400">Próximamente habrá nuevas clases disponibles.</p>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {classes.map((item) => (
                <div key={item.id} className="rounded border border-white/10 bg-white/5 p-5 flex flex-col justify-between">
                  <div>
                    <h2 className="text-xl font-bold uppercase">{item.name}</h2>
                    <p className="mt-2 text-sm text-gray-400">{item.description}</p>
                  </div>
                  <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
                    <span className="text-lg font-bold text-[#CCFF00]">
                      {(item.price_cents / 100).toFixed(2)} €
                    </span>
                    <button className="rounded bg-[#CCFF00] px-4 py-2 text-xs font-bold uppercase text-black hover:brightness-110">
                      Reservar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Footer estático integrado */}
      <footer className="border-t border-white/10 py-8 text-center text-xs text-gray-500 uppercase tracking-widest">
        <div className="flex justify-center mb-2">
          <span className="text-[#CCFF00] text-lg">📊</span>
        </div>
        © 2026 THE LAB — HOTTIE · SALAMANCA, ESPAÑA
      </footer>
    </div>
  );
}
