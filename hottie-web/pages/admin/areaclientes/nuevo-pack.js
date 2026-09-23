import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import AdminGuard from '../../../components/AdminGuard';
import AdminHeader from '../../../components/AdminHeader';
import { supabase } from '../../../lib/supabaseClient';

export default function NuevoPackPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [fileKey, setFileKey] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    const { error } = await supabase.from('packs').insert([{ title, description, file_key: fileKey }]);
    if (error) {
      setMessage(`Error al crear pack: ${error.message}`);
      setLoading(false);
    } else {
      router.push('/admin');
    }
  }

  return (
    <AdminGuard>
      <Head>
        <title>Añadir Kit / Pack — The Lab</title>
      </Head>
      <AdminHeader />
      <div className="mx-auto max-w-2xl px-5 py-10">
        <h1 className="font-display text-2xl tracking-wide text-paper mb-6">Añadir Kit / Pack de Descarga</h1>

        <form onSubmit={handleSubmit} className="space-y-6 rounded-sm border border-white/10 bg-surface p-6">
          {message && <div className="rounded bg-volt/25 p-3 text-xs text-volt">{message}</div>}

          <div>
            <label className="block text-xs uppercase tracking-widest text-muted mb-2">Título del Pack</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Ej. Drumkit Vol. 1"
              className="w-full rounded-sm border border-white/20 bg-surface2 px-4 py-2 text-paper focus:border-volt focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-widest text-muted mb-2">Descripción</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Breve descripción del pack..."
              className="w-full rounded-sm border border-white/20 bg-surface2 px-4 py-2 text-paper focus:border-volt focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-widest text-muted mb-2">Enlace / Archivo R2 (Key)</label>
            <input
              type="text"
              value={fileKey}
              onChange={(e) => setFileKey(e.target.value)}
              required
              placeholder="Ej. drumkit-vol1.zip o enlace de descarga"
              className="w-full rounded-sm border border-white/20 bg-surface2 px-4 py-2 text-paper focus:border-volt focus:outline-none"
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="rounded-sm bg-volt px-6 py-2 text-xs font-semibold uppercase tracking-widest text-ink hover:brightness-110 disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Publicar Pack'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/admin')}
              className="rounded-sm border border-white/20 px-6 py-2 text-xs font-semibold uppercase tracking-widest text-muted hover:text-paper"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </AdminGuard>
  );
}
