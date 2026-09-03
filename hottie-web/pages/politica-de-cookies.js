import Head from 'next/head';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function PoliticaDeCookies() {
  return (
    <>
      <Head>
        <title>Política de Cookies | The Lab – Hottie</title>
      </Head>

      <Navbar />

      <main className="mx-auto max-w-4xl px-5 py-16 font-body text-paper">
        <h1 className="font-display text-3xl font-bold uppercase tracking-wide text-volt mb-8">
          Política de Cookies
        </h1>

        <div className="space-y-6 text-sm leading-relaxed text-muted">
          <p>
            Una <strong className="text-paper">cookie</strong> es un pequeño fichero de texto que se almacena en su navegador cuando visita casi cualquier página web. Su utilidad es que la web sea capaz de recordar su visita cuando vuelva a navegar por esa página. Las cookies suelen almacenar información de carácter técnico, preferencias personales, personalización de contenidos, estadísticas de uso, enlaces a redes sociales, acceso a cuentas de usuario, etc. El objetivo de la cookie es adaptar el contenido de la web a su perfil y necesidades; sin cookies, los servicios ofrecidos por cualquier página se verían mermados notablemente.
          </p>

          <h2 className="text-lg font-bold text-paper uppercase tracking-wider pt-4">
            Cookies utilizadas en este sitio web
          </h2>
          <p>
            Siguiendo las directrices de la Agencia Española de Protección de Datos, procedemos a detallar el uso de cookies que hace esta web con el fin de informarle con la máxima exactitud posible.
          </p>

          <p className="font-semibold text-paper pt-2">Este sitio web utiliza las siguientes cookies de terceros:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong className="text-paper">Google Analytics:</strong> Almacena cookies para poder elaborar estadísticas sobre el tráfico y volumen de visitas de esta web. Al utilizar este sitio web está consintiendo el tratamiento de información acerca de usted por Google. Por tanto, el ejercicio de cualquier derecho en este sentido deberá hacerlo comunicando directamente con Google.
            </li>
            <li>
              <strong className="text-paper">Redes sociales:</strong> Cada red social utiliza sus propias cookies para que usted pueda pinchar en botones del tipo Me gusta o Compartir.
            </li>
          </ul>

          <h2 className="text-lg font-bold text-paper uppercase tracking-wider pt-4">
            Desactivación o eliminación de cookies
          </h2>
          <p>
            En cualquier momento podrá ejercer su derecho de desactivación o eliminación de cookies de este sitio web. Estas acciones se realizan de forma diferente en función del navegador que esté usando (Chrome, Safari, Firefox, Edge).
          </p>

          <h2 className="text-lg font-bold text-paper uppercase tracking-wider pt-4">
            Notas adicionales
          </h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              Ni esta web ni sus representantes legales se hacen responsables ni del contenido ni de la veracidad de las políticas de privacidad que puedan tener los terceros mencionados en esta política de cookies.
            </li>
            <li>
              Los navegadores web son las herramientas encargadas de almacenar las cookies y desde este lugar debe efectuar su derecho a eliminación o desactivación de las mismas. Ni esta web ni sus representantes legales pueden garantizar la correcta o incorrecta manipulación de las cookies por parte de los mencionados navegadores.
            </li>
            <li>
              En algunos casos es necesario instalar cookies para que el navegador no olvide su decisión de no aceptación de las mismas.
            </li>
            <li>
              En el caso de las cookies de Google Analytics, esta empresa almacena las cookies en servidores ubicados en Estados Unidos y se compromete a no compartirla con terceros, excepto en los casos en los que sea necesario para el funcionamiento del sistema o cuando la ley obligue a tal efecto.
            </li>
            <li>
              Para cualquier duda o consulta acerca de esta política de cookies no dude en comunicarse con nosotros a través de la sección de contacto.
            </li>
          </ul>
        </div>
      </main>

      <Footer />
    </>
  );
}
