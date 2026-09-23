import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import AdminGuard from '../../../components/AdminGuard';
import AdminHeader from '../../../components/AdminHeader';
import { supabase } from '../../../lib/supabaseClient';

export default function NuevoPostPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    const { error } = await supabase.from('posts').insert([{ title, content }]);
    if (error) {
      setMessage(`Error al crear post: ${error.message}`);
      setLoading(false);
    } else {
      router.push('/admin');
    }
  }

  return (
    <AdminGuard>
      <Head>
        <title>Añadir Post Exclusivo — The Lab</title>
      </Head>
      <AdminHeader />
      <div className="mx-auto max-w-2xl px-5 py-10">
        <h1 className="font-display text-2xl tracking-wide text-paper mb-6">Añadir Post Exclusivo</h1>

        <form onSubmit={handleSubmit} className="space-y-6 rounded-sm border border-white/10 bg-surface p-6">
          {message && <div className="rounded bg-volt/25 p-3 text-xs text-volt">{message}</div>}

          <div>
            <label className="block text-xs uppercase tracking-widest text-muted mb-2">Título</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Ej. Novedades del mes"
              className="w-full rounded-sm border border-white/20 bg-surface2 px-4 py-2 text-paper focus:border-volt focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-widest text-muted mb-2">Contenido del Post</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              required
              placeholder="Escribe el texto exclusivo para los suscriptores..."
              className="w-full rounded-sm border border-white/20 bg-surface2 px-4 py-2 text-paper focus:border-volt focus:outline-none"
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="rounded-sm bg-volt px-6 py-2 text-xs font-semibold uppercase tracking-widest text-ink hover:brightness-110 disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Publicar Post'}
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
