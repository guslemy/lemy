import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Aviso de Privacidad",
  description: "Cómo Lemy recaba, usa y protege tus datos personales.",
};

function Section({ title, id, children }: { title: string; id?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mt-10 scroll-mt-24">
      <h2 className="font-display text-[1.25rem] text-forest">{title}</h2>
      <div className="mt-3 space-y-3 text-[0.95rem] leading-relaxed text-[#3E4B44]">{children}</div>
    </section>
  );
}

export default function AvisoPrivacidadPage() {
  return (
    <>
      <SiteHeader />
      <main className="px-6 py-16 sm:px-8 md:py-20">
        <div className="mx-auto max-w-[720px]">
          <p className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-rose-deep">Legal</p>
          <h1 className="mt-2.5 font-display text-[2rem] font-medium text-forest sm:text-[2.4rem]">
            Aviso de Privacidad
          </h1>
          <p className="mt-3 text-[0.9rem] text-[#5A665F]">Última actualización: octubre de 2026.</p>

          <Section title="1. Responsable del tratamiento de tus datos">
            <p>
              Lemy (&quot;Lemy&quot;, &quot;nosotros&quot;) es responsable del tratamiento de los datos
              personales que recabamos a través de lemy.mx y sus servicios relacionados. Puedes
              contactarnos en{" "}
              <a href="mailto:hola@lemy.mx" className="text-forest underline">
                hola@lemy.mx
              </a>{" "}
              para cualquier duda sobre este aviso o el tratamiento de tus datos.
            </p>
          </Section>

          <Section title="2. Datos personales que recabamos">
            <p>Dependiendo de cómo uses Lemy, podemos recabar:</p>
            <p>
              <strong className="text-forest">Si eres paciente:</strong> nombre, correo electrónico,
              teléfono (opcional, para recordatorios), la información de las sesiones que agendes
              (terapeuta elegido, fecha y hora), y — solo si tu terapeuta decide registrarlas — notas
              clínicas de sesión que tu terapeuta escribe sobre tu proceso terapéutico. Estas notas
              están cifradas, son visibles únicamente para el terapeuta que las escribió, y ni Lemy ni
              ningún otro tercero tiene acceso a su contenido.
            </p>
            <p>
              <strong className="text-forest">Si eres terapeuta:</strong> nombre, correo, teléfono,
              cédula profesional, formación, fotografía de perfil, tarifas, disponibilidad, y los datos
              necesarios para procesar tu suscripción (a través de Stripe) y crear eventos en tu Google
              Calendar cuando confirmas una cita.
            </p>
            <p>
              <strong className="text-forest">Cuestionario de match (&quot;/test&quot;):</strong>{" "}
              por diseño, este cuestionario no guarda ninguna respuesta ligada a tu identidad. Las
              respuestas viven solo en tu navegador durante la sesión y se descartan al salir.
            </p>
          </Section>

          <Section title="3. Finalidades del tratamiento">
            <p>
              Usamos tus datos para: crear y administrar tu cuenta; conectar pacientes con terapeutas
              según su motivo de consulta; agendar y confirmar sesiones (incluyendo la creación de
              eventos en Google Calendar con enlace de Google Meet); procesar pagos de suscripción de
              terapeutas a través de Stripe; enviarte notificaciones relacionadas con tus citas y tu
              cuenta (por correo y, cuando esté disponible, WhatsApp); y mejorar el servicio.
            </p>
          </Section>

          <Section title="4. Transferencia de datos a terceros">
            <p>Para operar Lemy, compartimos datos estrictamente necesarios con:</p>
            <p>
              <strong className="text-forest">Supabase</strong> (base de datos y autenticación),{" "}
              <strong className="text-forest">Vercel</strong> (alojamiento de la aplicación),{" "}
              <strong className="text-forest">Google</strong> (inicio de sesión y creación de eventos
              de calendario, solo si eres terapeuta y lo autorizas),{" "}
              <strong className="text-forest">Stripe</strong> (procesamiento de pagos de suscripción),{" "}
              <strong className="text-forest">Resend</strong> (envío de correos transaccionales), y{" "}
              <strong className="text-forest">Meta / WhatsApp Business</strong> (envío de recordatorios
              por WhatsApp, cuando esté activo). Ninguno de estos terceros puede usar tus datos para
              fines distintos a los que contratamos con ellos.
            </p>
          </Section>

          <Section id="google" title="5. Información de Google (Google Calendar)">
            <p>
              <strong className="text-forest">Qué datos de Google recibimos.</strong> Al iniciar
              sesión con Google recibimos tu nombre, tu correo electrónico y tu foto de perfil, que
              usamos únicamente para crear y identificar tu cuenta en Lemy. Si además eres
              terapeuta y decides conectar tu Google Calendar, Lemy te pide dos permisos, y solo
              para lo siguiente:
            </p>
            <p>
              <strong className="text-forest">Consultar tu disponibilidad (calendar.events.freebusy).</strong>{" "}
              Google nos dice únicamente en qué intervalos de tiempo estás ocupado, sin títulos,
              descripciones, invitados ni ningún otro detalle de tus eventos. Lo usamos para no
              ofrecer a tus pacientes horarios que ya tienes ocupados. Estos intervalos no se
              guardan en nuestra base de datos; solo se conservan en una caché temporal del servidor
              por unos 30 segundos para no consultar a Google en cada visita a tu perfil.
            </p>
            <p>
              <strong className="text-forest">Crear y administrar los eventos de tus citas (calendar.events.owned).</strong>{" "}
              Cuando una cita se confirma, Lemy crea el evento en tu calendario (con enlace de Google
              Meet si la sesión es en línea e invitando al paciente) y, si la cita se reagenda o se
              cancela en Lemy, mueve o borra ese mismo evento. Solo trabajamos con el calendario principal que es tuyo, y no leemos, modificamos ni
              borramos otros eventos de tu calendario.
            </p>
            <p>
              <strong className="text-forest">Cómo protegemos tu información de Google.</strong>{" "}
              Para poder crear y mover eventos sin que tengas que estar conectado, guardamos el
              token de acceso que Google emite para tu cuenta. Ese token se almacena cifrado en
              reposo en Supabase Vault (nunca en texto plano) y solo puede leerlo el servidor de
              Lemy: la tabla donde se registra tiene el acceso bloqueado para cualquier usuario,
              incluido el propio dueño de la cuenta, y las funciones que lo leen o lo escriben solo
              se pueden ejecutar con la credencial privada del servidor, que nunca se expone en el
              navegador ni en el código público. Toda la comunicación entre tu navegador, Lemy,
              Supabase y Google viaja cifrada con HTTPS/TLS. Aparte de ese token, del identificador
              y del enlace de videollamada de los eventos que Lemy crea, no guardamos copia de tu
              calendario.
            </p>
            <p>
              <strong className="text-forest">Con quién se comparte.</strong> Los datos de tu
              calendario (disponibilidad y eventos) y el token de acceso solo los procesan Google y
              los proveedores de infraestructura que operan Lemy por nosotros (Supabase, que aloja
              la base de datos, y Vercel, que aloja la aplicación); no se envían a nadie más. Tu
              nombre y tu correo, que recibimos al iniciar sesión con Google, también se usan con
              Resend (para enviarte los correos de tu cuenta y de tus citas) y, si eres terapeuta,
              con Stripe (para cobrar tu suscripción), únicamente para esos fines. No compartimos
              información de Google con nadie más, salvo por seguridad o por obligación legal. Al
              paciente solo le llega la invitación al evento de Google Calendar de su cita.
            </p>
            <p>
              <strong className="text-forest">Acceso, conservación y eliminación.</strong> Las
              personas que trabajan en Lemy no tienen acceso rutinario al token ni a tu información
              de Google, y solo la consultarían con tu consentimiento, por seguridad o por
              obligación legal. Conservamos el token mientras tengas Google Calendar conectado con
              Lemy y lo eliminamos en estos casos: cuando cierras tu cuenta desde Cerrar mi cuenta
              (en ese momento también le pedimos a Google que lo revoque), o cuando nos lo pides
              escribiendo a hola@lemy.mx. Si revocas el acceso desde tu cuenta de Google, el token
              deja de ser válido de inmediato.
            </p>
            <p>
              No usamos esta información para publicidad, no la vendemos, no la transferimos a
              terceros salvo lo necesario para operar el servicio, por seguridad o por obligación
              legal, y no la usamos para entrenar modelos de inteligencia artificial.
            </p>
            <p>
              (In English — Google user data protection: the Google refresh token is encrypted at
              rest in Supabase Vault and can only be read by Lemy&apos;s server using a private
              credential that is never exposed to the browser; all traffic is encrypted in transit
              with HTTPS/TLS. Free/busy data is not stored in our database (it is cached on the
              server for about 30 seconds). Lemy personnel do not routinely access this data and
              would do so only with your consent, for security reasons, or to comply with the law.
              Calendar data and the access token are processed only by Google and by the
              infrastructure providers that operate Lemy on our behalf (Supabase for the database,
              Vercel for hosting). The name and email received at sign-in are also used with Resend
              (account and appointment emails) and, for therapists, Stripe (subscription billing),
              only for those purposes; Google user data is not shared with anyone else, except for
              security reasons or as required by law. We keep the token while Calendar is connected, and delete it
              (and ask Google to revoke it) when you close your account or when you ask us at
              hola@lemy.mx; you can also revoke access at any time at
              myaccount.google.com/permissions.)
            </p>
            <p>
              Puedes revocar el acceso en cualquier momento desde{" "}
              <a
                href="https://myaccount.google.com/permissions"
                target="_blank"
                rel="noreferrer"
                className="text-forest underline"
              >
                myaccount.google.com/permissions
              </a>
              , o escribiéndonos a{" "}
              <a href="mailto:hola@lemy.mx" className="text-forest underline">
                hola@lemy.mx
              </a>{" "}
              para que eliminemos el token que guardamos.
            </p>
            <p>
              El uso y la transferencia a cualquier otra aplicación de la información recibida de las
              APIs de Google se apegará a la{" "}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noreferrer"
                className="text-forest underline"
              >
                Política de Datos de Usuario de los Servicios de API de Google
              </a>
              , incluidos los requisitos de uso limitado. (Lemy&apos;s use and transfer to any other
              app of information received from Google APIs will adhere to the Google API Services User
              Data Policy, including the Limited Use requirements.)
            </p>
          </Section>

          <Section title="6. Datos sensibles">
            <p>
              Consideramos que el motivo por el que buscas terapia, y cualquier información
              relacionada con tu salud mental, son datos sensibles. Por eso el cuestionario de match
              no los guarda ligados a tu identidad. El historial clínico (notas de sesión que tu
              terapeuta puede registrar sobre tu proceso) se almacena cifrado a nivel de aplicación:
              ni con acceso directo a nuestra base de datos es posible leer su contenido en texto
              plano. Solo el terapeuta que las escribió puede leerlas — ni Lemy, ni el paciente, ni
              ningún otro terapeuta tienen acceso. Las notas no se pueden editar una vez guardadas,
              solo eliminarse, lo que preserva la integridad del registro.
            </p>
          </Section>

          <Section title="7. Derechos ARCO">
            <p>
              Tienes derecho a Acceder, Rectificar, Cancelar u Oponerte al tratamiento de tus datos
              personales (derechos ARCO), así como a revocar tu consentimiento en cualquier momento.
              Para ejercerlos, escríbenos a{" "}
              <a href="mailto:hola@lemy.mx" className="text-forest underline">
                hola@lemy.mx
              </a>{" "}
              indicando tu nombre, el derecho que deseas ejercer, y una identificación que nos permita
              verificar que eres tú.
            </p>
          </Section>

          <Section title="8. Cambios a este aviso">
            <p>
              Podemos actualizar este aviso conforme evolucione Lemy. Los cambios importantes se
              publicarán en esta misma página con su fecha de actualización.
            </p>
          </Section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
