import Head from 'next/head';
import Seo from '../components/Seo';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

// Condiciones de venta. Por decisión del dueño, sin datos personales del
// titular: solo el nombre de la marca y el email de contacto público. Las
// reglas de clases, servicios y devoluciones son las mismas que en pages/faq.js.
const EMAIL = 'hottieprodthis@gmail.com';

function Titulo({ children, id }) {
  return <h2 id={id} className="scroll-mt-24 text-lg font-bold text-paper uppercase tracking-wider pt-4">{children}</h2>;
}

export default function CondicionesDeVenta() {
  return (
    <>
      <Seo
        title="Condiciones de Venta | The Lab by Hottie"
        description="Condiciones de compra de productos digitales, servicios, clases y suscripción en The Lab by Hottie."
        path="/condiciones-de-venta"
      />

      <Navbar />

      <main className="mx-auto max-w-4xl px-5 py-16 font-body text-paper">
        <h1 className="font-display text-3xl font-bold uppercase tracking-wide text-volt mb-8">
          Condiciones de Venta
        </h1>

        <div className="space-y-6 text-sm leading-relaxed text-muted">
          <p>
            Estas condiciones se aplican a todas las compras hechas en <strong className="text-paper">hottieprodthis.com</strong>{' '}
            (The Lab by Hottie): productos digitales, servicios, clases y la suscripción al área de clientes. Al comprar,
            aceptas estas condiciones. Para cualquier duda, escríbenos a{' '}
            <a href={`mailto:${EMAIL}`} className="text-volt underline">{EMAIL}</a>.
          </p>

          <Titulo>Precios y pagos</Titulo>
          <ul className="list-disc pl-5 space-y-2">
            <li>Los precios están en euros y el precio que ves al pagar es el precio final.</li>
            <li>Puedes pagar con tarjeta de crédito/débito, Apple Pay, Google Pay, PayPal, Bizum, Klarna, Amazon Pay o Link (la suscripción, con tarjeta, que se renueva sola cada mes, o con PayPal, que se paga mes a mes desde tu área de cliente). Los pagos los gestionan Stripe y PayPal.</li>
            <li>
              Algunos pagos se pueden hacer <strong className="text-paper">a plazos</strong> con Klarna o con «Paga en 3
              plazos» de PayPal, si te lo aprueban. Los plazos son un acuerdo entre tú y Klarna o PayPal: para nosotros el
              pago está hecho entero desde el primer momento.
            </li>
            <li>
              Las <strong className="text-paper">ofertas</strong> se aplican solo durante las fechas indicadas en la web
              (verás el precio normal tachado y la fecha de fin). Después, el precio vuelve a ser el normal.
            </li>
          </ul>

          <Titulo>Productos digitales (kits, sample packs, melodías)</Titulo>
          <ul className="list-disc pl-5 space-y-2">
            <li>Tras el pago recibirás por email el enlace de descarga.</li>
            <li>
              La compra te da una <strong className="text-paper">licencia de uso</strong> para tus producciones musicales.
              Son Royalty-Free para lanzamientos independientes en plataformas de streaming.
            </li>
            <li>
              Si una canción que los use consigue una colocación con un sello discográfico mayoritario, una distribuidora
              relevante o un artista de primer nivel, o supera 1.000.000 de reproducciones, habrá que negociar el reparto
              de royalties/publishing y el crédito de producción.
            </li>
            <li>
              Está prohibido revender, redistribuir o volver a subir los archivos, sueltos o dentro de otros paquetes de
              sonido.
            </li>
          </ul>

          <Titulo>Servicios de mezcla, mastering y seguimiento</Titulo>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              Nada más pagar, la web te lleva a un formulario para que nos cuentes los detalles. Después nos pondremos en
              contacto contigo para coordinarlo.
            </li>
            <li>
              Los archivos se entregan con enlace de Drive, WeTransfer o TransferNow, en 24-bit / 48 kHz (WAV) o MP3 a
              320 kbps. Recibirás el trabajo terminado en WAV (24-bit / 48 kHz) y MP3 (320 kbps).
            </li>
            <li>
              Plazo de entrega de un single: de 3 a 29 días hábiles, según la complejidad y la carga de trabajo. Para EP,
              álbumes o servicios integrales, el plazo se acuerda al revisar el proyecto.
            </li>
            <li>
              <strong className="text-paper">Seguimiento:</strong> servicio mensual con revisiones ilimitadas dentro del
              mes y del horario acordado. Las revisiones fuera de ese horario o del mes contratado tienen un coste extra.
            </li>
          </ul>

          <Titulo>Clases</Titulo>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              Las clases sueltas (1 hora, 2 horas…) se imparten en una sesión. La clase de 12 horas son 4 sesiones de 3
              horas dentro de una misma semana, de lunes a viernes.
            </li>
            <li>Horario habitual: de lunes a viernes de 16:00 a 21:00 (hora de España peninsular).</li>
            <li>
              Hay un margen de cortesía de 15 minutos. Pasado ese tiempo sin aviso, la clase se da por impartida, sin
              posibilidad de recuperarla.
            </li>
            <li>Cambiar la fecha o la hora de una clase ya programada tiene un recargo de 20 €.</li>
            <li>No grabamos las clases, pero puedes grabar tu pantalla para repasarlas.</li>
          </ul>

          <Titulo>Plazas limitadas</Titulo>
          <p>
            Para poder atender bien cada encargo, cada semana hay un número limitado de servicios y clases, y cada mes
            un número limitado de seguimientos. Si se completan, la web no te dejará comprar hasta que haya plazas de
            nuevo, y te indicará cuándo.
          </p>

          <Titulo>Suscripción al área de clientes</Titulo>
          <ul className="list-disc pl-5 space-y-2">
            <li>Da acceso a los posts y packs exclusivos del área de clientes mientras esté activa.</li>
            <li>
              <strong className="text-paper">Con tarjeta:</strong> se renueva automáticamente cada mes hasta que la
              canceles desde tu área de clientes. Si un cobro no se puede hacer, el acceso se retira.
            </li>
            <li>
              <strong className="text-paper">Con PayPal:</strong> pagas un mes y no se renueva solo. En tu área verás
              hasta cuándo tienes acceso y podrás renovar otro mes.
            </li>
            <li>Si hay una oferta de suscripción, el descuento se aplica al primer mes.</li>
            <li>
              <strong className="text-paper">Descuento para suscriptores:</strong> cuando está activo, los suscriptores
              (mensuales y de por vida) pagan menos en la tienda, los servicios y/o las clases, según se indique en la web
              en cada momento (porcentaje, en qué se aplica y hasta cuándo). Hay que tener la sesión iniciada al pagar. No se
              suma a otras ofertas: si algo ya está de oferta, se paga el precio de la oferta. Podemos cambiarlo o quitarlo
              cuando queramos, sin que afecte a lo ya pagado.
            </li>
            <li>
              <strong className="text-paper">Revisión de tu tema:</strong> cada suscriptor puede mandar un tema al mes
              mientras queden plazas del cupo mensual (que es para todos y se reparte por orden de llegada). Es una opinión
              orientativa y breve, por escrito, sobre cómo vemos el tema comercialmente y qué le falta en calidad y sonido;
              no es un servicio de mezcla o mastering ni garantiza ningún resultado. Solo aceptamos enlaces de las plataformas
              indicadas en el formulario. El tema sigue siendo tuyo: solo lo escuchamos para hacer la revisión y no lo
              compartimos con nadie.
            </li>
            <li>
              <strong className="text-paper">Votaciones:</strong> son orientativas; nos ayudan a decidir qué contenido
              preparar, pero la decisión final es nuestra.
            </li>
          </ul>

          <Titulo id="por-vida">Suscripción de por vida</Titulo>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              Es un <strong className="text-paper">pago único</strong> que da acceso, sin cuotas ni renovaciones, a todo el
              contenido exclusivo del área de clientes: lo que ya está publicado y lo que se publique después.
            </li>
            <li>
              <strong className="text-paper">«De por vida» significa mientras exista el área de clientes de The Lab</strong>,
              no la vida de la persona. Si algún día cerrásemos el área de clientes de forma definitiva, te avisaríamos por
              email con al menos 60 días de antelación para que puedas descargar el contenido al que tienes acceso.
            </li>
            <li>
              Es personal e intransferible: es para tu cuenta. Compartir la cuenta o redistribuir el contenido puede suponer
              la retirada del acceso.
            </li>
            <li>
              Si tenías la suscripción mensual con tarjeta, se cancela automáticamente al pagar la de por vida, para que no
              se te cobre nunca más. Lo que ya hubieras pagado de la mensual no se devuelve.
            </li>
            <li>
              Las ventajas que dependen de plazas o fechas (revisiones con cupo mensual, descuentos para suscriptores,
              votaciones) se aplican igual que a los suscriptores mensuales, mientras estén disponibles.
            </li>
            <li>Su precio y sus ofertas pueden cambiar, pero eso nunca afecta a quien ya la tiene.</li>
          </ul>

          <Titulo>Devoluciones</Titulo>
          <p>
            No se realizan reembolsos una vez realizado el pago. En los servicios y las clases, solo se devuelve el
            dinero en casos excepcionales y justificados de ausencia total de Hottie. Los productos de la tienda y la
            suscripción al área de clientes (mensual o de por vida) no tienen devolución en ningún caso: el producto se
            entrega al momento de pagar y la suscripción da acceso desde ese momento a todo su contenido, por lo que al
            comprarlos aceptas perder el derecho de desistimiento. Todo ello sin perjuicio de los derechos que la
            legislación de consumo te reconozca en cada caso.
          </p>

          <Titulo>Contacto y reclamaciones</Titulo>
          <p>
            Para cualquier problema con un pedido, escríbenos a{' '}
            <a href={`mailto:${EMAIL}`} className="text-volt underline">{EMAIL}</a>{' '}
            o usa cualquiera de las vías de la página de{' '}
            <Link href="/contacto" className="text-volt underline">contacto</Link>. Intentaremos resolverlo lo antes
            posible.
          </p>
          <p>
            El tratamiento de tus datos se explica en la{' '}
            <Link href="/politica-de-privacidad" className="text-volt underline">Política de privacidad</Link>.
          </p>
          <p className="pt-4 text-xs">Última actualización: octubre de 2026.</p>
        </div>
      </main>

      <Footer />
    </>
  );
}
