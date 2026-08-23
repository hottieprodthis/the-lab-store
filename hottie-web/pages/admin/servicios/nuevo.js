import Head from 'next/head';
import AdminGuard from '../../../components/AdminGuard';
import AdminHeader from '../../../components/AdminHeader';
import ItemForm from '../../../components/ItemForm';

export default function NuevoServicio() {
  return (
    <AdminGuard>
      <Head>
        <title>Nuevo servicio — Panel</title>
      </Head>
      <AdminHeader title="Nuevo servicio" />
      <div className="mx-auto max-w-5xl px-5 py-10">
        <h1 className="mb-8 font-display text-3xl tracking-wide text-paper">Nuevo servicio</h1>
        <ItemForm table="services" hasFileUrl={false} />
      </div>
    </AdminGuard>
  );
}
