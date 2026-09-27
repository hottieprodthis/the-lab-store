import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useCart } from '../context/CartContext';
import { supabase } from '../lib/supabaseClient';

export default function Gracias() {
  const router = useRouter();
  const { tipo, session_id } = router.query;
  const { clearCart } = useCart();
  const [subscribing, setSubscribing] = useState(false);
  const [subMessage, setSubMessage] = useState('');

  useEffect(() => {
    // Vaciamos el carrito de compras local
    try {
      if (typeof clearCart === 'function') {
        clearCart();
      }
      localStorage.removeItem('hottie_cart');
      localStorage.removeItem('cart');
      localStorage.removeItem('cart_data');
      localStorage.removeItem('carrito');
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.error('Error vaciando carrito:', e);
    }
  }, []);

  // Activación blindada de la suscripción
  useEffect(() => {
    async function activateSubscription() {
      if (tipo === 'suscripcion' && session_id) {
        setSubscribing(true);
        try {
          // Nos aseguramos de obtener la sesión actual antes de invocar la función
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session) {
            console.log('Sesión activa encontrada. Activando suscripción vía RPC...');
            const { error } = await supabase.rpc('activar_mi_suscripcion');

            if (error) {
              console.error('Error al activar suscripción:', error.message);
              setSubMessage('Hubo un error al activar tu suscripción. Contacta con soporte.');
            } else {
              console.log('¡Suscripción marcada como true en la base de datos con éxito!');
              setSubMessage('¡Suscripción activada con éxito! Ya puedes acceder a todo el contenido exclusivo.');
            }
          } else {
            console.warn('Esperando a que la sesión se sincronice...');
            // Pequeño reintento por si la sesión tarda un segundo en cargarse tras el redirect de Stripe
            setTimeout(async () => {
              const { error } = await supabase.rpc('activar_mi_suscripcion');
              if (!error) {
                setSubMessage('¡Suscripción activada con éxito! Ya puedes acceder a todo el contenido exclusivo.');
              }
            }, 1500);
          }
        } catch (err) {
          console.error('Error procesando suscripción:', err);
        } finally {
          setSubscribing(false);
        }
      }
    }

    if (router.isReady) {
      activateSubscription();
    }
  }, [router.isReady, tipo, session_id]);

  // El "tipo" puede venir ahora como una cadena compuesta y
  // order-independent (ej. "producto_servicio", "servicio_clase",
  // "producto_servicio_clase") generada en pages/api/checkout.js.
  // Usamos .includes() en vez de comparación estricta para que
  // cualquier combinación se detecte correctamente, sin importar en
  // qué orden se añadieron los artículos al carrito.
  const tipoStr = typeof tipo === 'string' ? tipo : '';
  const esSuscripcion = tipoStr === 'suscripcion';
  const esMixtoLegado = tipoStr === 'mixto'; // compatibilidad con enlaces antiguos

  const tieneProducto = tipoStr.includes('producto');
  const tieneServicio = tipoStr.includes('servicio');
  const tieneClase = tipoStr.includes('clase');
  const totalCategorias = [tieneProducto, tieneServicio, tieneClase].filter(Boolean).length;

  const esCompuesto = !esSuscripcion && (esMixtoLegado || totalCategorias > 1);
  const esServicio = !esCompuesto && !esSuscripcion && tieneServicio;
  const esClase = !esCompuesto && !esSuscripcion && tieneClase;
  const esMixto = esCompuesto;

  let mensajeMixto = 'Tu pedido ha sido procesado con éxito.';
  if (esCompuesto) {
    const partes = [];
    if (tieneProducto || esMixtoLegado) {
      partes.push('revisa tu correo electrónico para acceder a los archivos y enlaces de descarga de tus productos');
    }
    if (tieneServicio && tieneClase) {
      partes.push('nos pondremos en contacto contigo por correo o WhatsApp para coordinar el servicio y la clase que has reservado');
    } else if (tieneServicio) {
      partes.push('nos pondremos en contacto contigo por correo o WhatsApp para comenzar con tu servicio');
    } else if (tieneClase) {
      partes.push('nos pondremos en contacto contigo por correo o WhatsApp para coordinar tu clase');
    }
    if (esMixtoLegado && partes.length === 0) {
      partes.push('revisa tu correo electrónico para ver el detalle de tu pedido');
    }
    if (partes.length > 0) {
      const partesCapitalizadas = partes.map((p) => p.charAt(0).toUpperCase() + p.slice(1));
      mensajeMixto = 'Tu pedido ha sido procesado con éxito. ' + partesCapitalizadas.join('. ') + '.';
    }
  }

  return (
    <>
      <Head>
        <title>¡Gracias por tu compra! — The Lab</title>
      </Head>

      <Navbar />

      <main className="mx-auto max-w-3xl px-5 py-20 text-center">
        <div className="bg-surface p-10 border border-white/10 rounded-sm">
          <div className="mx-auto w-16 h-16 bg-volt/10 text-volt rounded-full flex items-center justify-center text-3xl mb-6">
            ✓
          </div>

          <h1 className="font-display text-4xl md:text-5xl text-paper tracking-wide">
            {esSuscripcion ? '¡SUSCRIPCIÓN ACTIVADA!' : '¡MUCHAS GRACIAS POR TU COMPRA!'}
          </h1>

          <p className="mt-4 text-muted text-lg max-w-lg mx-auto">
            {esSuscripcion && (
              subMessage || 'Tu pago mensual se ha procesado correctamente. Ya tienes acceso completo al Área de Clientes.'
            )}
            {esClase && (
              'Hemos recibido la reserva de tu clase correctamente. En breve nos pondremos en contacto contigo por correo o WhatsApp para coordinar la sesión.'
            )}
            {esServicio && (
              'Hemos recibido los datos de tu proyecto correctamente. En breve nos pondremos en contacto contigo por correo o WhatsApp para comenzar.'
            )}
            {esMixto && mensajeMixto}
            {!esServicio && !esClase && !esMixto && !esSuscripcion && (
              'Tu pedido ha sido procesado con éxito. Revisa tu correo electrónico para acceder a los archivos y enlaces de descarga.'
            )}
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            {esSuscripcion ? (
              <a
                href="/area-cliente"
                className="w-full sm:w-auto bg-volt text-ink font-bold px-8 py-3 text-sm uppercase tracking-wider transition hover:brightness-110 inline-block"
              >
                Ir al Área de Clientes
              </a>
            ) : (
              <a
                href="/"
                className="w-full sm:w-auto bg-volt text-ink font-bold px-8 py-3 text-sm uppercase tracking-wider transition hover:brightness-110 inline-block"
              >
                Inicio
              </a>
            )}

            <a
              href="/contacto"
              className="w-full sm:w-auto border border-white/20 text-paper font-semibold px-8 py-3 text-sm uppercase tracking-wider transition hover:border-white inline-block"
            >
              Contacto
            </a>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
