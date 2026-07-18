import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Términos de Uso",
  description: "Condiciones bajo las cuales puedes usar Lemy.",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-[1.25rem] text-forest">{title}</h2>
      <div className="mt-3 space-y-3 text-[0.95rem] leading-relaxed text-[#3E4B44]">{children}</div>
    </section>
  );
}

export default function TerminosPage() {
  return (
    <>
      <SiteHeader />
      <main className="px-6 py-16 sm:px-8 md:py-20">
        <div className="mx-auto max-w-[720px]">
          <p className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-rose-deep">Legal</p>
          <h1 className="mt-2.5 font-display text-[2rem] font-medium text-forest sm:text-[2.4rem]">
            Términos de Uso
          </h1>
          <p className="mt-3 text-[0.9rem] text-[#5A665F]">Última actualización: julio de 2026.</p>

          <Section title="1. Qué es Lemy">
            <p>
              Lemy es un directorio y plataforma de conexión entre personas que buscan terapia
              psicológica y terapeutas verificados. Lemy no presta servicios de salud ni terapéuticos
              directamente: los terapeutas que aparecen en el directorio son profesionales
              independientes, responsables de su propia práctica clínica, ética y cumplimiento
              profesional.
            </p>
          </Section>

          <Section title="2. Quién puede usar Lemy">
            <p>
              Para crear una cuenta necesitas ser mayor de edad, o actuar como madre, padre o tutor
              legal de la persona que recibirá terapia. Si agendas una sesión para un menor o para
              otra persona, declaras contar con la autorización correspondiente.
            </p>
          </Section>

          <Section title="3. Cuentas de terapeutas">
            <p>
              Al crear un perfil de terapeuta declaras que la información que proporcionas (incluida
              tu cédula profesional) es verdadera y vigente. Lemy revisa esta información antes de
              marcar un perfil como &quot;verificado&quot;, pero la responsabilidad última sobre la
              veracidad de tus credenciales y la calidad de tu práctica profesional es tuya.
            </p>
            <p>
              El acceso a funciones de terapeuta (perfil publicado, agenda) depende de mantener una
              prueba gratuita vigente o una suscripción activa, según los planes vigentes en tu panel.
            </p>
          </Section>

          <Section title="4. Agendar y cancelar sesiones">
            <p>
              Al solicitar una cita, el terapeuta debe confirmarla para que quede agendada en firme.
              Cualquiera de las dos partes puede cancelar desde su panel; la otra parte recibe aviso
              de inmediato. Lemy puede mostrar la tasa de cancelación de un terapeuta como parte de la
              transparencia del directorio.
            </p>
          </Section>

          <Section title="5. Pagos">
            <p>
              Los pagos de suscripción de terapeutas se procesan a través de Stripe, conforme a los
              precios y condiciones mostrados en el panel al momento de suscribirse. Lemy no participa
              hoy en el cobro de las sesiones entre paciente y terapeuta; eso se acuerda directamente
              entre ambos, salvo que se indique lo contrario en el futuro.
            </p>
          </Section>

          <Section title="6. Limitación de responsabilidad">
            <p>
              Lemy facilita el encuentro entre pacientes y terapeutas, pero no supervisa el contenido
              de las sesiones ni garantiza resultados clínicos. En la máxima medida permitida por la
              ley, Lemy no es responsable por daños derivados de la relación terapéutica entre
              paciente y terapeuta.
            </p>
          </Section>

          <Section title="7. Propiedad intelectual">
            <p>
              El nombre, logotipo, diseño y contenido de Lemy son propiedad de Lemy y no pueden
              reproducirse sin autorización, salvo el contenido que cada terapeuta sube a su propio
              perfil, que sigue siendo de su autoría.
            </p>
          </Section>

          <Section title="8. Cambios a estos términos">
            <p>
              Podemos actualizar estos términos conforme evolucione Lemy. Los cambios importantes se
              publicarán en esta misma página con su fecha de actualización.
            </p>
          </Section>

          <Section title="9. Ley aplicable">
            <p>
              Estos términos se rigen por las leyes de los Estados Unidos Mexicanos. Cualquier
              controversia se someterá a los tribunales competentes en Oaxaca, México.
            </p>
          </Section>

          <p className="mt-12 rounded-2xl border border-line bg-card px-5 py-4 text-[0.85rem] text-[#5A665F]">
            Este documento es un borrador funcional para cubrir lo básico de operar el directorio y
            los requisitos de verificación de Google. Antes de publicarlo como definitivo, se
            recomienda que un abogado lo revise y confirme la razón social exacta y cualquier detalle
            específico del negocio.
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
