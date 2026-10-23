import Head from 'next/head';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

// Política de privacidad. Por decisión del dueño, sin datos personales del
// titular: solo el nombre de la marca y el email de contacto público.
const EMAIL = 'hottieprodthis@gmail.com';

function Titulo({ children }) {
  return <h2 className="text-lg font-bold text-paper uppercase tracking-wider pt-4">{children}</h2>;
}

export default function PoliticaDePrivacidad() {
  return (
    <>
      <Head>
        <title>Política de Privacidad | The Lab – Hottie</title>
      </Head>

      <Navbar />

      <main className="mx-auto max-w-4xl px-5 py-16 font-body text-paper">
        <h1 className="font-display text-3xl font-bold uppercase tracking-wide text-volt mb-8">
          Política de Privacidad
        </h1>

        <div className="space-y-6 text-sm leading-relaxed text-muted">
          <p>
            En <strong className="text-paper">The Lab – Hottie</strong> (hottieprodthis.com) cuidamos tus datos. Aquí te
            explicamos qué datos recogemos, para qué los usamos, con quién los compartimos y qué derechos tienes.
          </p>

          <Titulo>Quién trata tus datos</Titulo>
          <p>
            The Lab – Hottie, a través de la web hottieprodthis.com. Para cualquier cuestión sobre tus datos puedes
            escribirnos a{' '}
            <a href={`mailto:${EMAIL}`} className="text-volt underline">{EMAIL}</a>.
          </p>

          <Titulo>Qué datos recogemos</Titulo>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong className="text-paper">Cuenta de cliente:</strong> tu email y tu contraseña (que se guarda cifrada;
              nadie puede verla), y tus preferencias de avisos.
            </li>
            <li>
              <strong className="text-paper">Compras:</strong> lo que compras, el importe, la fecha y tu email, para
              entregarte el pedido y que lo veas en tu historial.
            </li>
            <li>
              <strong className="text-paper">Formularios tras la compra (briefing):</strong> nombre o nombre artístico,
              email, teléfono, estilo musical, enlaces a tus proyectos y los detalles que quieras contarnos para
              preparar tu servicio o clase.
            </li>
            <li>
              <strong className="text-paper">Boletín:</strong> tu email, si te apuntas para recibir novedades.
            </li>
            <li>
              <strong className="text-paper">Pagos:</strong> los datos de tu tarjeta, Bizum, Klarna o PayPal los recogen y
              guardan directamente Stripe o PayPal. Nosotros nunca vemos ni guardamos los datos de tu tarjeta.
            </li>
            <li>
              <strong className="text-paper">Estadísticas de visitas:</strong> solo si aceptas las cookies (ver la{' '}
              <Link href="/politica-de-cookies" className="text-volt underline">Política de cookies</Link>).
            </li>
          </ul>

          <Titulo>Para qué los usamos y por qué podemos hacerlo</Titulo>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong className="text-paper">Gestionar tus compras, servicios, clases, tu cuenta y tu suscripción</strong>{' '}
              y enviarte los correos necesarios (confirmación, enlaces de descarga, coordinación). Es necesario para
              cumplir lo que has contratado.
            </li>
            <li>
              <strong className="text-paper">Enviarte novedades</strong> (boletín, avisos de productos nuevos o
              contenido exclusivo) solo si te has apuntado o lo has activado. Puedes darte de baja cuando quieras.
            </li>
            <li>
              <strong className="text-paper">Medir el uso de la web</strong>, solo si aceptas las cookies de estadística.
            </li>
            <li>
              <strong className="text-paper">Cumplir obligaciones legales</strong>, por ejemplo conservar el registro de
              las ventas el tiempo que marque la ley.
            </li>
          </ul>
          <p>No vendemos tus datos a nadie ni los usamos para publicidad de terceros.</p>

          <Titulo>Con quién los compartimos</Titulo>
          <p>
            Solo con los servicios que necesitamos para que la web funcione, que tratan los datos por encargo nuestro y
            con sus propias medidas de seguridad:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong className="text-paper">Supabase</strong> — base de datos y cuentas de usuario (servidores en la Unión Europea).</li>
            <li><strong className="text-paper">Vercel</strong> — alojamiento de la web.</li>
            <li><strong className="text-paper">Stripe</strong> y <strong className="text-paper">PayPal</strong> — cobro de los pagos.</li>
            <li><strong className="text-paper">Resend</strong> — envío de los correos de la web.</li>
            <li><strong className="text-paper">Cloudflare</strong> — almacenamiento de los archivos descargables.</li>
            <li><strong className="text-paper">Google Analytics</strong> — estadísticas de visitas, solo si las aceptas.</li>
          </ul>
          <p>
            Algunos de estos proveedores pueden tratar datos fuera del Espacio Económico Europeo (por ejemplo, en
            Estados Unidos). En esos casos lo hacen con las garantías que exige la normativa europea de protección de
            datos.
          </p>

          <Titulo>Cuánto tiempo los guardamos</Titulo>
          <ul className="list-disc pl-5 space-y-2">
            <li>Los datos de tu cuenta, mientras la tengas activa.</li>
            <li>Los de tus compras, el tiempo que exija la ley.</li>
            <li>Tu email del boletín, hasta que te des de baja.</li>
            <li>Los datos de los formularios, el tiempo necesario para prestarte el servicio o la clase.</li>
          </ul>

          <Titulo>Tus derechos</Titulo>
          <p>
            Puedes pedir en cualquier momento <strong className="text-paper">ver</strong> tus datos,{' '}
            <strong className="text-paper">corregirlos</strong>, <strong className="text-paper">borrarlos</strong>,{' '}
            <strong className="text-paper">oponerte</strong> a su uso, <strong className="text-paper">limitarlo</strong>{' '}
            o <strong className="text-paper">llevártelos</strong> a otro sitio, y retirar tu consentimiento cuando
            quieras. Escríbenos a{' '}
            <a href={`mailto:${EMAIL}`} className="text-volt underline">{EMAIL}</a>{' '}
            indicando qué necesitas.
          </p>
          <p>
            Si crees que no hemos tratado bien tus datos, puedes presentar una reclamación ante la Agencia Española de
            Protección de Datos (
            <a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer" className="text-volt underline">www.aepd.es</a>
            ).
          </p>

          <Titulo>Menores de edad</Titulo>
          <p>
            Para crear una cuenta o comprar en la web debes tener al menos 14 años. Si eres menor, necesitas el permiso
            de tus padres o tutores para hacer compras.
          </p>

          <Titulo>Seguridad</Titulo>
          <p>
            Aplicamos medidas para proteger tus datos: conexión cifrada, acceso restringido a la información y pagos
            gestionados íntegramente por plataformas especializadas.
          </p>

          <Titulo>Cambios en esta política</Titulo>
          <p>Si cambiamos algo importante de esta política, lo publicaremos en esta misma página.</p>
          <p className="pt-4 text-xs">Última actualización: octubre de 2026.</p>
        </div>
      </main>

      <Footer />
    </>
  );
}
