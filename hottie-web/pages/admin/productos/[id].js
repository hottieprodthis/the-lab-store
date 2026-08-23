import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import AdminGuard from '../../../components/AdminGuard';
import AdminHeader from '../../../components/AdminHeader';
import ItemForm from '../../../components/ItemForm';
import { supabase } from '../../../lib/supabaseClient';

export default function EditarProducto() {
  const router = useRouter();
  const { id } = router.query;
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        setItem(data);
        setLoading(false);
      });
  }, [id]);

  return (
    <AdminGuard>
      <Head>
        <title>Editar producto — Panel</title>
      </Head>
      <AdminHeader title="Editar producto" />
      <div className="mx-auto max-w-5xl px-5 py-10">
        <h1 className="mb-8 font-display text-3xl tracking-wide text-paper">Editar producto</h1>
        {loading ? (
          <p className="text-muted">Cargando…</p>
        ) : item ? (
          <ItemForm table="products" initial={item} hasFileUrl />
        ) : (
          <p className="text-muted">No se ha encontrado este producto.</p>
        )}
      </div>
    </AdminGuard>
  );
}
