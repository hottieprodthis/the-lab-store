import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import AdminGuard from '../../../components/AdminGuard';
import AdminHeader from '../../../components/AdminHeader';
import { createClient } from '@supabase/supabase-js';

// Cliente con permisos de administración
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function NuevaClase() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    price_cents: 0,
    currency: 'EUR',
    active: true,
  });

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabaseAdmin.from('classes').insert([
      {
        name: form.name,
        description: form.description,
        price_cents: Math.round(parseFloat(form.price_cents) * 100),
        currency: form.currency,
        active: form.active,
      },
    ]);

    setLoading(false);

    if (error) {
      alert(`Error al crear la clase: ${error.message}`);
    } else {
      router.push('/admin');
    }
  }

  return (
    <AdminGuard>
      <Head>
        <title>Nueva Clase — Panel The Lab</title>
      </Head>
      <AdminHeader />
      <div className="mx-auto max-w-2xl px-5 py-10 text-paper">
        <h1 className="font-display text-3xl mb-6">AÑADIR NUEVA CLASE</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs uppercase tracking-widest text-muted mb-2">Nombre de la clase</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded border border-white/10 bg-surface px-4 py-2 text-paper focus:border-[#CCFF00] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-widest text-muted mb-2">Precio (€)</label>
            <input
              type="number"
              step="0.01"
              required
              value={form.price_cents}
              onChange={(e) => setForm({ ...form, price_cents: e.target.value })}
              className="w-full rounded border border-white/10 bg-surface px-4 py-2 text-paper focus:border-[#CCFF00] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-widest text-muted mb-2">Descripción</label>
            <textarea
              rows="4"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full rounded border border-white/10 bg-surface px-4 py-2 text-paper focus:border-[#CCFF00] focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-volt py-3 font-semibold text-ink uppercase tracking-wider hover:brightness-110"
          >
            {loading ? 'Guardando…' : 'Crear Clase'}
          </button>
        </form>
      </div>
    </AdminGuard>
  );
}
