import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ScrollReveal } from "@/components/scroll-reveal";
import { HeroOrbs } from "@/components/hero-orbs";
import { DirectoryPreview } from "@/components/directory-preview";
import { Button } from "@/components/ui/button";
import { QuizFloatingTab } from "@/components/quiz-floating-tab";
import { HeroSearch } from "@/components/hero-search";
import { HeroRotatingWord } from "@/components/hero-rotating-word";

const HERO_PILLS = ["Ansiedad", "Pareja", "Duelo", "Autoestima", "Adolescentes", "Trauma"];

const STEPS = [
  {
    num: "1",
    title: "Cuéntanos qué buscas",
    body: "Tu motivo de consulta, preferencias de modalidad y lo que te haría sentir cómodo.",
  },
  {
    num: "2",
    title: "Te mostramos opciones afines",
    body: "Perfiles reales de terapeutas verificados que trabajan justamente lo que necesitas.",
  },
  {
    num: "3",
    title: "Agenda tu primera sesión",
    body: "Contacta directo, sin intermediarios, y agenda cuando estés list@ para dar el paso.",
  },
];

const CATEGORIES = [
  { eyebrow: "Emocional", title: "Ansiedad y estrés", body: "Herramientas para regular el día a día y entender de dónde viene." },
  { eyebrow: "Vínculos", title: "Terapia de pareja", body: "Comunicación, conflictos recurrentes y reconstruir la confianza." },
  { eyebrow: "Procesos", title: "Duelo y pérdida", body: "Acompañamiento para procesar una pérdida a tu propio ritmo." },
  { eyebrow: "Personal", title: "Autoestima", body: "Reconstruir la relación contigo mism@ desde un lugar más amable." },
  { eyebrow: "Familia", title: "Adolescentes y familia", body: "Especialistas en dinámicas familiares y desarrollo adolescente." },
  { eyebrow: "Especializado", title: "Trauma", body: "Abordajes específicos para experiencias difíciles del pasado." },
];

const TRUST = [
  { mark: "Verificado", body: "Revisamos la cédula profesional de cada terapeuta antes de publicar su perfil." },
  { mark: "Privado", body: "Tus búsquedas y conversaciones con terapeutas están protegidas y no se comparten." },
  { mark: "Directo", body: "Contactas al terapeuta sin intermediarios; tú decides con quién y cuándo continuar." },
];

export default function HomePage() {
  return (
    <>
      <SiteHeader />

      <main>
        {/* HERO */}
        <section className="px-6 pb-16 pt-16 sm:px-8 md:pt-20">
          <div className="mx-auto grid max-w-[1180px] items-center gap-12 md:grid-cols-[1.1fr_0.9fr] md:gap-14">
            <div>
              <p className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-rose-deep">
                Directorio de salud mental
              </p>
              <h1 className="mt-2.5 font-display text-[2.4rem] font-medium leading-[1.08] text-forest sm:text-[3rem] md:text-[3.6rem]">
                Quiero encontrar a alguien
                <br />
                que me <HeroRotatingWord />
              </h1>
              <p className="mt-5 max-w-[480px] text-lg text-[#3E4B44]">
                Lemy conecta a personas con terapeutas certificados según su motivo de consulta, no
                según quién paga más publicidad. Claro, humano y sin vueltas.
              </p>

              <div className="mt-9 max-w-[480px] rounded-[24px] border border-line bg-card p-6 shadow-[var(--shadow-signature)]">
                <p className="font-display text-[1.15rem] text-forest">
                  ¿No sabes por dónde empezar?
                </p>
                <p className="mt-1.5 text-[0.92rem] text-[#42504A]">
                  Cuéntanos un poco sobre ti — 5 preguntas breves y anónimas, sin necesidad de crear
                  una cuenta — y te acercamos a los terapeutas con quienes tendrías mayor afinidad.
                </p>
                <Button href="/encuentra" variant="primary" className="mt-4.5 w-full">
                  Iniciar test de afinidad
                </Button>
              </div>

              <HeroSearch suggestions={HERO_PILLS} />
            </div>

            <HeroOrbs />
          </div>
        </section>

        <QuizFloatingTab />

        {/* QUE ES LEMY */}
        <ScrollReveal>
          <section id="que-es-lemy" className="py-20 md:py-24">
            <div className="mx-auto max-w-[1180px] px-6 sm:px-8">
              <div className="mb-12 max-w-[620px]">
                <p className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-rose-deep">Sobre Lemy</p>
                <h2 className="mt-2.5 font-display text-[1.9rem] font-medium text-forest sm:text-[2.5rem]">
                  ¿Qué es Lemy?
                </h2>
                <p className="mt-3.5 text-[1.05rem] text-[#3E4B44]">
                  Lemy es un directorio de salud mental donde puedes encontrar al terapeuta ideal
                  para el <HeroRotatingWord words={["malestar", "dolor", "vacío", "agobio"]} /> que
                  sientes, en solo 3 pasos:
                </p>
              </div>

              <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
                {STEPS.map((step) => (
                  <div key={step.num} className="rounded-[18px] border border-line bg-card p-7">
                    <div className="mb-4.5 flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-forest to-[#2E5240] font-display text-[1.05rem] text-white">
                      {step.num}
                    </div>
                    <h3 className="text-[1.15rem] text-forest">{step.title}</h3>
                    <p className="mt-2.5 text-[0.95rem] text-[#42504A]">{step.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* CONFIANZA */}
        <ScrollReveal>
          <section id="confianza" className="py-20 md:py-24">
            <div className="mx-auto max-w-[1180px] px-6 sm:px-8">
              <div className="mb-12 max-w-[620px]">
                <p className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-rose-deep">Confianza</p>
                <h2 className="mt-2.5 font-display text-[1.9rem] font-medium text-forest sm:text-[2.5rem]">
                  Buscar ayuda no debería sentirse riesgoso
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-7 sm:grid-cols-3">
                {TRUST.map((item) => (
                  <div key={item.mark}>
                    <p className="font-display text-[1.6rem] italic text-rose-deep">{item.mark}</p>
                    <p className="mt-2.5 text-[0.94rem] leading-relaxed text-[#3E4B44]">{item.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* CATEGORIAS */}
        <ScrollReveal>
          <section className="py-20 md:py-24">
            <div className="mx-auto max-w-[1180px] px-6 sm:px-8">
              <div className="mb-12 max-w-[620px]">
                <p className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-rose-deep">Explora por motivo</p>
                <h2 className="mt-2.5 font-display text-[1.9rem] font-medium text-forest sm:text-[2.5rem]">
                  ¿Qué te trae por aquí hoy?
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {CATEGORIES.map((cat) => (
                  <a
                    key={cat.title}
                    href="#directorio"
                    className="rounded-[18px] border border-line bg-card p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-signature)]"
                  >
                    <p className="font-mono text-[0.7rem] tracking-[0.08em] text-rose-deep">{cat.eyebrow}</p>
                    <h3 className="mt-2 text-[1.2rem] text-forest">{cat.title}</h3>
                    <p className="mt-1.5 text-[0.88rem] text-[#4A564F]">{cat.body}</p>
                  </a>
                ))}
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* DIRECTORIO (preview con datos de ejemplo) */}
        <ScrollReveal>
          <section id="directorio" className="py-20 md:py-24">
            <div className="mx-auto max-w-[1180px] px-6 sm:px-8">
              <div className="mb-12 max-w-[620px]">
                <p className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-rose-deep">Directorio</p>
                <h2 className="mt-2.5 font-display text-[1.9rem] font-medium text-forest sm:text-[2.5rem]">
                  Terapeutas verificados, listos para acompañarte
                </h2>
                <p className="mt-3.5 text-[1.05rem] text-[#3E4B44]">
                  Filtra por lo que necesitas trabajar. Cada perfil incluye formación, enfoque y modalidad.
                </p>
              </div>

              <DirectoryPreview />
            </div>
          </section>
        </ScrollReveal>

        {/* PERFIL DESTACADO */}
        <ScrollReveal>
          <section id="perfil" className="py-20 md:py-24">
            <div className="mx-auto max-w-[1180px] px-6 sm:px-8">
              <div className="mb-12 max-w-[620px]">
                <p className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-rose-deep">Así se ve un perfil</p>
                <h2 className="mt-2.5 font-display text-[1.9rem] font-medium text-forest sm:text-[2.5rem]">
                  El espacio para mostrar tu trabajo como se merece
                </h2>
              </div>

              <div className="signature-corner grid grid-cols-1 gap-10 rounded-[36px] border border-line bg-card p-8 md:grid-cols-[0.85fr_1.15fr] md:gap-12 md:p-13">
                <div className="border-b border-line pb-7 md:border-b-0 md:border-r md:pb-0 md:pr-11">
                  <div className="flex h-[100px] w-[100px] items-center justify-center rounded-full bg-gradient-to-br from-rose to-rose-deep font-display text-3xl font-semibold text-white">
                    MT
                  </div>
                  <h3 className="mt-4.5 text-[1.4rem] text-forest">Mariana Torres</h3>
                  <p className="mt-1 font-mono text-[0.85rem] text-rose-deep">Psicóloga clínica · Céd. Prof. 8452XXX</p>

                  <div className="mt-5.5 space-y-2.5 text-[0.88rem] text-[#3E4B44]">
                    <div><strong className="mr-2.5 inline-block min-w-[110px] font-semibold text-forest">Enfoque</strong>Cognitivo-conductual</div>
                    <div><strong className="mr-2.5 inline-block min-w-[110px] font-semibold text-forest">Población</strong>Adultos, adultos jóvenes</div>
                    <div><strong className="mr-2.5 inline-block min-w-[110px] font-semibold text-forest">Modalidad</strong>Online y presencial (CDMX)</div>
                    <div><strong className="mr-2.5 inline-block min-w-[110px] font-semibold text-forest">Idiomas</strong>Español, inglés</div>
                    <div><strong className="mr-2.5 inline-block min-w-[110px] font-semibold text-forest">Tarifa</strong>desde $600 MXN / sesión</div>
                  </div>

                  <Button href="/login" variant="primary" className="mt-6 w-full">
                    Agendar consulta
                  </Button>
                </div>

                <div>
                  <h4 className="mb-2.5 font-mono text-[0.75rem] uppercase tracking-[0.1em] text-rose-deep">Sobre mí</h4>
                  <p className="mb-6.5 text-[0.96rem] text-[#37433D]">
                    Llevo 9 años acompañando a personas que sienten que la ansiedad les ha quitado
                    espacio en su vida diaria. Combino herramientas prácticas con un espacio donde no
                    tienes que explicar de más para sentirte entendid@.
                  </p>

                  <h4 className="mb-2.5 font-mono text-[0.75rem] uppercase tracking-[0.1em] text-rose-deep">Formación</h4>
                  <p className="mb-6.5 text-[0.96rem] text-[#37433D]">
                    Lic. en Psicología, Universidad Iberoamericana · Maestría en Terapia
                    Cognitivo-Conductual, UNAM · Certificación en manejo de crisis de ansiedad.
                  </p>

                  <div className="mb-6.5 border-l-[3px] border-rose pl-4.5 font-display text-[1.02rem] italic text-forest">
                    &quot;Llegué pensando que necesitaba &apos;arreglarme&apos;. Mariana me ayudó a entender que
                    solo necesitaba herramientas que nadie me había enseñado.&quot;
                    <span className="mt-2 block font-sans text-[0.8rem] not-italic text-[#6B776F]">
                      — Paciente, terapia en línea desde 2024
                    </span>
                  </div>

                  <h4 className="mb-2.5 font-mono text-[0.75rem] uppercase tracking-[0.1em] text-rose-deep">Cómo trabajo</h4>
                  <p className="text-[0.96rem] text-[#37433D]">
                    Primera sesión de valoración sin costo para ver si hay buena conexión. Sesiones de
                    50 minutos, semanales o quincenales según tu proceso.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* PARA TERAPEUTAS */}
        <ScrollReveal>
          <section id="terapeutas" className="py-20 md:py-24">
            <div className="mx-auto max-w-[1180px] px-6 sm:px-8">
              <div className="relative overflow-hidden rounded-[40px] bg-forest p-8 md:grid md:grid-cols-2 md:items-center md:gap-10 md:p-16">
                <div
                  className="pointer-events-none absolute -right-20 -top-30 h-[340px] w-[340px] rounded-full"
                  style={{ background: "radial-gradient(circle, rgba(227,183,172,0.35), transparent 70%)" }}
                />

                <div className="relative">
                  <p className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-rose">¿Eres terapeuta?</p>
                  <h2 className="mt-2.5 font-display text-[1.9rem] font-medium text-sage-white sm:text-[2.5rem]">
                    Tu consulta merece verse tan profesional como es
                  </h2>
                  <p className="mt-4 text-[1.02rem] text-sage-white/80">
                    Muestra tu experiencia, tu formación y a quién atiendes, en un perfil pensado para
                    que la persona correcta te encuentre, no cualquiera.
                  </p>
                  <div className="mt-7 flex flex-wrap gap-3.5">
                    <Button href="/login" variant="rose">
                      Crear mi perfil
                    </Button>
                    <Button href="#perfil" variant="outline-light">
                      Ver ejemplo de perfil
                    </Button>
                  </div>
                </div>

                <div className="relative mt-10 flex flex-col gap-4.5 md:mt-0">
                  {[
                    "Perfil completo: formación, enfoque, población de atención y tarifas.",
                    "Te encuentran personas que ya buscan justo lo que tú atiendes.",
                    "Sin comisiones ocultas por sesión agendada.",
                    "Verificación de cédula profesional que da confianza a tus pacientes.",
                  ].map((benefit) => (
                    <div
                      key={benefit}
                      className="flex gap-3.5 rounded-2xl border border-line-dark bg-white/[0.06] p-4.5"
                    >
                      <span className="flex h-8.5 w-8.5 flex-none items-center justify-center rounded-full bg-rose text-sm font-bold text-forest-deep">
                        ✓
                      </span>
                      <p className="text-[0.92rem] text-sage-white/90">{benefit}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </ScrollReveal>
      </main>

      <SiteFooter />
    </>
  );
}
