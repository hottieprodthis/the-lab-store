import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import AdminGuard from '../../../components/AdminGuard';
import AdminHeader from '../../../components/AdminHeader';
import ItemForm from '../../../components/ItemForm';
import { supabase } from '../../../lib/supabaseClient';

export default function EditarClase() {
  const router = useRouter();
  const { id } = router.query;
  const [clase, setClase] = useState(null);
  const [loading, setLoading] = useState(true);

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
      } else {
        setClase(data);
      }
      setLoading(false);
    }
    loadClass();
  }, [id]);

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
        ) : clase ? (
          <ItemForm table="classes" initial={clase} />
        ) : (
          <p className="text-muted">Clase no encontrada.</p>
        )}
      </div>
    </AdminGuard>
  );
}
