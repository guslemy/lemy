import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Aviso de Privacidad",
  description: "Cómo Lemy recaba, usa y protege tus datos personales.",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
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
          <p className="mt-3 text-[0.9rem] text-[#5A665F]">Última actualización: julio de 2026.</p>

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
              <strong className="text-forest">Google</strong> (inicio de sesión y creación de eventos
              de calendario, solo si eres terapeuta y lo autorizas),{" "}
              <strong className="text-forest">Stripe</strong> (procesamiento de pagos de suscripción),{" "}
              <strong className="text-forest">Resend</strong> (envío de correos transaccionales), y{" "}
              <strong className="text-forest">Meta / WhatsApp Business</strong> (envío de recordatorios
              por WhatsApp, cuando esté activo). Ninguno de estos terceros puede usar tus datos para
              fines distintos a los que contratamos con ellos.
            </p>
          </Section>

          <Section title="5. Datos sensibles">
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

          <Section title="6. Derechos ARCO">
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

          <Section title="7. Cambios a este aviso">
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
