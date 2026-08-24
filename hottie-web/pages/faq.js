import Head from 'next/head';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const faqCategories = [
  {
    category: "Clases de Producción, Mezcla y Mastering",
    icon: "🎓",
    questions: [
      {
        q: "¿Qué DAW o nivel necesito para tomar las clases?",
        a: "Utilizamos FL Studio. Las clases están adaptadas a todos los niveles, desde principiantes hasta avanzados/profesionales. Si necesitas algún plugin específico para la clase, te lo facilitaré previamente."
      },
      {
        q: "¿En qué horario y franja horaria se imparten las clases?",
        a: "El horario habitual de atención y clases es de Lunes a Viernes de 16:00 a 21:00 y Sábados de 19:00 a 20:00 (Hora de España peninsular / CET). Tenlo en cuenta para coordinar tu cita si te conectas desde fuera de España."
      },
      {
        q: "¿Cómo se reparten las horas de los packs de clases?",
        a: "• Pack 2 Horas: Se imparte en una única sesión.\n• Pack 12 Horas: Se estructura en 4 sesiones de 3 horas cada una.\n\nNota importante: Todos los packs de clases deben consumirse en un plazo máximo de 2 semanas desde las citas y horarios programados."
      },
      {
        q: "¿Las clases son adaptadas o hay un temario fijo?",
        a: "Cada clase se adapta 100% a lo que tú quieras aprender (producción, mezcla, mastering o ambas). Antes de comenzar la sesión, coordinamos el contenido que abordaremos ese día."
      },
      {
        q: "¿Se graban las clases?",
        a: "Yo no grabo las sesiones, pero tienes total libertad para grabar tu pantalla (donde se verá reflejada la mía) para repasarla cuando quieras."
      },
      {
        q: "¿Qué pasa si te retrasas o no te presentas a una clase?",
        a: "Se concede un margen de cortesía de 15 minutos de espera. Pasado ese tiempo sin previo aviso, la clase se dará por impartida sin posibilidad de recuperación."
      },
      {
        q: "¿Qué pasa si necesitas reprogramar una clase ya agendada?",
        a: "Si necesitas cambiar la fecha o hora de una clase ya programada, se aplicará un recargo de 20€ por reprogramación."
      }
    ]
  },
  {
    category: "Servicio de Seguimiento Avanzado",
    icon: "🔄",
    questions: [
      {
        q: "¿En qué consiste y cómo funciona el seguimiento?",
        a: "Es un servicio mensual donde trabajamos 2 horas por semana (de Lunes a Viernes, entre las 16:00 y las 21:00, hora de España CET). La comunicación fluida se realiza por WhatsApp (dudas rápidas, notificaciones, planificación) y las sesiones de revisión de pantalla por Discord."
      },
      {
        q: "¿Cuántas revisiones se incluyen durante el seguimiento?",
        a: "Dentro del mes de servicio y del horario estipulado, tienes revisiones ilimitadas. Las revisiones fuera del horario o una vez finalizado el mes tendrán un coste extra de entre 30€ y 50€."
      }
    ]
  },
  {
    category: "Servicios de Mezcla y Mastering",
    icon: "🎚️",
    questions: [
      {
        q: "¿Cómo debo preparar mis archivos para enviártelos?",
        a: "• Mezcla y Mastering: Debes enviar los Stems/Tracks exportados desde el segundo cero, con los efectos propios de tu producción aplicados.\n• Solo Mastering: Debes enviar un único Track de la mezcla finalizada.\n\nFormato exigido: 24-bit / 48 kHz, WAV o MP3 320kbps."
      },
      {
        q: "¿Cómo y dónde entrego mis pistas?",
        a: "Podrás subirlas mediante nuestro formulario web después de la página de pago adjuntando tu enlace de Drive, WeTransfer o TransferNow."
      },
      {
        q: "¿En qué formato recibiré mi trabajo terminado?",
        a: "Recibirás tu proyecto en formato WAV (24-bit / 48 kHz) y MP3 (320kbps)."
      },
      {
        q: "¿Cuáles son los plazos de entrega?",
        a: "• Single: El plazo de entrega es de 3 a 29 días hábiles (dependiendo de la complejidad y carga de trabajo).\n• EP o Álbum completo / Servicio Integral: Definiremos el plazo estimado de entrega una vez revisado el volumen del proyecto."
      }
    ]
  },
  {
    category: "Kits, Sample Packs y Productos Digitales",
    icon: "🥁",
    questions: [
      {
        q: "¿Los Sample Packs, Melodías o Kits son libres de copyright (Royalty-Free)?",
        a: "Son Royalty-Free para lanzamientos independientes. Puedes utilizarlos libremente en plataformas de streaming (Spotify, YouTube, Apple Music) para proyectos independientes sin pagar regalías extra."
      },
      {
        q: "¿Qué ocurre si la canción es lanzada con un sello discográfico grande o supera un límite de reproducciones?",
        a: "Si la canción que utiliza nuestros samples o loops logra una colocación (placement) con un sello discográfico mayoritario (Major Label), una distribuidora relevante, un artista de primer nivel, o supera 1.000.000 de reproducciones en plataformas digital/streaming, se requerirá la negociación de la división de royalties/publishing (royalties compartidos) y el correspondiente crédito de producción ('Clearance')."
      },
      {
        q: "¿Puedo vender o redistribuir los sonidos de los kits?",
        a: "No. La compra te otorga una licencia de uso para tus producciones musicales. Queda estrictamente prohibida la reventa, redistribución o resubida de los archivos de audio de forma individual o en otros paquetes de sonido."
      }
    ]
  },
  {
    category: "Pagos, Reservas y Política de Devoluciones",
    icon: "💳",
    questions: [
      {
        q: "¿Qué métodos de pago puedo utilizar?",
        a: "Aceptamos Tarjeta de crédito/débito, PayPal, Apple Pay, Bizum, Stripe, entre otros."
      },
      {
        q: "¿Qué debo hacer justo después de pagar un servicio?",
        a: "Debes contactar con Hottie enviando tu comprobante de pago vía WhatsApp, Email o Instagram para constar tu pedido."
      },
      {
        q: "¿Cuál es la política de devoluciones?",
        a: "No se realizan reembolsos una vez abonado el servicio, salvo casos excepcionales y justificados de ausencia total de Hottie."
      }
    ]
  }
];

export default function FAQ() {
  return (
    <>
      <Head>
        <title>Preguntas Frecuentes (FAQ) — THE LAB</title>
      </Head>

      <Navbar />

      <main className="mx-auto max-w-4xl px-5 py-16 text-paper">
        <header className="mb-14 text-center">
          <h1 className="font-display text-4xl sm:text-5xl uppercase tracking-wide">
            Preguntas <span className="text-volt">Frecuentes</span>
          </h1>
          <p className="mt-4 text-muted max-w-xl mx-auto text-sm sm:text-base">
            Resuelve todas tus dudas sobre nuestras clases, servicios de mezcla/mastering, kits de sonido y políticas de compra.
          </p>
        </header>

        <div className="space-y-12">
          {faqCategories.map((cat, idx) => (
            <section key={idx} className="bg-surface/50 border border-white/10 rounded-xl p-6 sm:p-8">
              <h2 className="text-xl sm:text-2xl font-bold mb-6 flex items-center gap-3 border-b border-white/10 pb-4 text-volt">
                <span>{cat.icon}</span> {cat.category}
              </h2>

              <div className="space-y-6">
                {cat.questions.map((item, qIdx) => (
                  <div key={qIdx} className="space-y-2">
                    <h3 className="text-base sm:text-lg font-semibold text-paper">
                      {item.q}
                    </h3>
                    <p className="text-muted text-sm sm:text-base leading-relaxed whitespace-pre-line">
                      {item.a}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-16 text-center bg-surface border border-volt/20 rounded-xl p-8">
          <h3 className="text-xl font-bold mb-2">¿Tienes alguna otra duda?</h3>
          <p className="text-muted text-sm mb-6">Estamos aquí para ayudarte. Escríbenos directamente.</p>
          <a
            href="mailto:hottieprodthis@gmail.com"
            className="inline-block rounded-sm bg-volt px-8 py-3 text-sm font-semibold uppercase tracking-widest text-ink transition hover:brightness-110"
          >
            Contactar por Email
          </a>
        </div>
      </main>

      <Footer />
    </>
  );
}
