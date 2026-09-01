import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import AdminGuard from '../../../components/AdminGuard';
import AdminHeader from '../../../components/AdminHeader';
import { supabase } from '../../../lib/supabaseClient';

export default function EditarClase() {
  const router = useRouter();
  const { id } = router.query;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    price_cents: 0,
    currency: 'EUR',
    active: true,
  });

  useEffect(() => {
    if (!id) return;
    async function loadClass() {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        alert(`Error al cargar la clase: ${error.message}`);
      } else if (data) {
        setForm({
          name: data.name || '',
          description: data.description || '',
          price_cents: data.price_cents ? data.price_cents / 100 : 0,
          currency: data.currency || 'EUR',
          active: data.active ?? true,
        });
      }
      setLoading(false);
    }
    loadClass();
  }, [id]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);

    const { error } = await supabase
      .from('classes')
      .update({
        name: form.name,
        description: form.description,
        price_cents: Math.round(parseFloat(form.price_cents) * 100),
        currency: form.currency,
        active: form.active,
      })
      .eq('id', id);

    setSaving(false);

    if (error) {
      alert(`Error al guardar cambios: ${error.message}`);
    } else {
      router.push('/admin');
    }
  }

  return (
    <AdminGuard>
      <Head>
        <title>Editar Clase — Panel The Lab</title>
      </Head>
      <AdminHeader />
      <div className="mx-auto max-w-2xl px-5 py-10 text-paper">
        <h1 className="font-display text-3xl mb-6">EDITAR CLASE</h1>

        {loading ? (
          <p className="text-muted">Cargando datos de la clase…</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs uppercase tracking-widest text-muted mb-2">
                Nombre de la clase
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded border border-white/10 bg-surface px-4 py-2 text-paper focus:border-[#CCFF00] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-widest text-muted mb-2">
                Precio (€)
              </label>
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
              <label className="block text-xs uppercase tracking-widest text-muted mb-2">
                Descripción
              </label>
              <textarea
                rows="4"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full rounded border border-white/10 bg-surface px-4 py-2 text-paper focus:border-[#CCFF00] focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="active"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
                className="h-4 w-4 rounded border-white/10 bg-surface accent-[#CCFF00]"
              />
              <label htmlFor="active" className="text-sm text-paper">
                Publicado
              </label>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded bg-volt py-3 font-semibold text-ink uppercase tracking-wider hover:brightness-110"
            >
              {saving ? 'Guardando…' : 'Guardar Cambios'}
            </button>
          </form>
        )}
      </div>
    </AdminGuard>
  );
}
