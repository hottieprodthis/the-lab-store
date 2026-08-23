import Head from 'next/head';
import AdminGuard from '../../../components/AdminGuard';
import AdminHeader from '../../../components/AdminHeader';
import ItemForm from '../../../components/ItemForm';

export default function NuevoProducto() {
  return (
    <AdminGuard>
      <Head>
        <title>Nuevo producto — Panel</title>
      </Head>
      <AdminHeader title="Nuevo producto" />
      <div className="mx-auto max-w-5xl px-5 py-10">
        <h1 className="mb-8 font-display text-3xl tracking-wide text-paper">Nuevo producto</h1>
        <ItemForm table="products" hasFileUrl />
      </div>
    </AdminGuard>
  );
}
