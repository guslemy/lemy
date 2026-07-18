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
              teléfono (opcional, para recordatorios), y la información de las sesiones que agendes
              (terapeuta elegido, fecha y hora). No guardamos el contenido clínico de tus sesiones a
              menos que lo indiquemos explícitamente en el futuro, con tu consentimiento expreso.
            </p>
            <p>
              <strong className="text-forest">Si eres terapeuta:</strong> nombre, correo, teléfono,
              cédula profesional, formación, fotografía de perfil, tarifas, disponibilidad, y los datos
              necesarios para procesar tu suscripción (a través de Stripe) y crear eventos en tu Google
              Calendar cuando confirmas una cita.
            </p>
            <p>
              <strong className="text-forest">Cuestionario de match (&quot;/encuentra&quot;):</strong>{" "}
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
              Consideramos que el motivo por el que buscas terapia es un dato sensible. Por eso el
              cuestionario de match no lo guarda ligado a tu identidad, y cualquier información
              relacionada con tu salud que llegáramos a almacenar en el futuro (por ejemplo, un
              historial clínico) requerirá tu consentimiento expreso y estará sujeta a medidas de
              seguridad reforzadas, descritas en un aviso específico cuando ese servicio esté
              disponible.
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

          <p className="mt-12 rounded-2xl border border-line bg-card px-5 py-4 text-[0.85rem] text-[#5A665F]">
            Este aviso es un borrador funcional pensado para cubrir los elementos que exige la
            LFPDPPP y los requisitos de verificación de Google. Antes de publicarlo como definitivo,
            se recomienda que un abogado lo revise y confirme la razón social exacta y cualquier
            detalle específico del negocio.
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
