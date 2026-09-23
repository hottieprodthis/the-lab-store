import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import AdminGuard from '../../../components/AdminGuard';
import AdminHeader from '../../../components/AdminHeader';
import { supabase } from '../../../lib/supabaseClient';

export default function EditItemPage() {
  const router = useRouter();
  const { id, type } = router.query;

  const [itemType, setItemType] = useState('post');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [description, setDescription] = useState('');
  const [fileKey, setFileKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!id) return;
    async function fetchItem() {
      let detectedType = type;
      if (!detectedType) {
        const { data: post } = await supabase.from('posts').select('*').eq('id', id).single();
        if (post) {
          detectedType = 'post';
        } else {
          detectedType = 'pack';
        }
      }

      setItemType(detectedType);

      const tableName = detectedType === 'post' ? 'posts' : 'packs';
      const { data, error } = await supabase.from(tableName).select('*').eq('id', id).single();

      if (data) {
        setTitle(data.title || '');
        if (detectedType === 'post') {
          setContent(data.content || '');
        } else {
          setDescription(data.description || '');
          setFileKey(data.file_key || '');
        }
      } else if (error) {
        setMessage(`Error al cargar: ${error.message}`);
      }
      setLoading(false);
    }
    fetchItem();
  }, [id, type]);

  async function handleUpdate(e) {
    e.preventDefault();
    setMessage('');
    const tableName = itemType === 'post' ? 'posts' : 'packs';
    
    const updateData = itemType === 'post' 
      ? { title, content } 
      : { title, description, file_key: fileKey };

    const { error } = await supabase.from(tableName).update(updateData).eq('id', id);

    if (error) {
      setMessage(`Error al actualizar: ${error.message}`);
    } else {
      setMessage('¡Actualizado con éxito!');
      setTimeout(() => router.push('/admin'), 1200);
    }
  }

  return (
    <AdminGuard>
      <Head>
        <title>Editar Elemento — The Lab</title>
      </Head>
      <AdminHeader />
      <div className="mx-auto max-w-2xl px-5 py-10">
        <h1 className="font-display text-2xl tracking-wide text-paper mb-6">
          Editar {itemType === 'post' ? 'Post Exclusivo' : 'Pack de Descarga'}
        </h1>

        {loading ? (
          <p className="text-muted">Cargando...</p>
        ) : (
          <form onSubmit={handleUpdate} className="space-y-6 rounded-sm border border-white/10 bg-surface p-6">
            {message && <div className="rounded bg-volt/25 p-3 text-xs text-volt">{message}</div>}

            <div>
              <label className="block text-xs uppercase tracking-widest text-muted mb-2">Título</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full rounded-sm border border-white/20 bg-surface2 px-4 py-2 text-paper focus:border-volt focus:outline-none"
              />
            </div>

            {itemType === 'post' ? (
              <div>
                <label className="block text-xs uppercase tracking-widest text-muted mb-2">Contenido</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={6}
                  required
                  className="w-full rounded-sm border border-white/20 bg-surface2 px-4 py-2 text-paper focus:border-volt focus:outline-none"
                />
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-muted mb-2">Descripción</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full rounded-sm border border-white/20 bg-surface2 px-4 py-2 text-paper focus:border-volt focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-muted mb-2">Archivo R2 (Key)</label>
                  <input
                    type="text"
                    value={fileKey}
                    onChange={(e) => setFileKey(e.target.value)}
                    required
                    className="w-full rounded-sm border border-white/20 bg-surface2 px-4 py-2 text-paper focus:border-volt focus:outline-none"
                  />
                </div>
              </>
            )}

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                className="rounded-sm bg-volt px-6 py-2 text-xs font-semibold uppercase tracking-widest text-ink hover:brightness-110"
              >
                Guardar Cambios
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
        )}
      </div>
    </AdminGuard>
  );
}
