import Head from 'next/head';
import AdminGuard from '../../../components/AdminGuard';
import AdminHeader from '../../../components/AdminHeader';
import ItemForm from '../../../components/ItemForm';

export default function NuevaClase() {
  return (
    <AdminGuard>
      <Head>
        <title>Nueva Clase — Panel The Lab</title>
      </Head>
      <AdminHeader />
      <div className="mx-auto max-w-2xl px-5 py-10 text-paper">
        <h1 className="font-display text-3xl mb-6">AÑADIR NUEVA CLASE</h1>
        <ItemForm table="classes" />
      </div>
    </AdminGuard>
  );
}
