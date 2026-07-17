import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ScrollReveal } from "@/components/scroll-reveal";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/pill";
import { QuizFloatingTab } from "@/components/quiz-floating-tab";
import { getAvailableSlots } from "@/lib/availability";
import { requestAppointment } from "./actions";

// Perfil público de un terapeuta. Solo visible si is_published = true
// (lo aplica la RLS "therapists_public_read" además del filtro explícito aquí).
// Nota: no leemos therapist_credentials aquí — su RLS es owner-only, un
// visitante anónimo nunca vería esas filas de todos modos. El badge de
// "verificado" sale directo del campo verification_status en therapists.

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ solicitado?: string; ocupado?: string; error?: string }>;
};

type CatalogItem = { slug: string; nombre_coloquial: string; descripcion_coloquial: string | null };

type TherapistDetail = {
  id: string;
  slug: string;
  display_name: string;
  city: string | null;
  zona: string | null;
  tagline: string | null;
  bio: string | null;
  languages: string[] | null;
  client_niches: string[] | null;
  is_online_available: boolean;
  price_min: number | null;
  price_max: number | null;
  verification_status: string;
  therapist_specialties: { specialty: CatalogItem | null }[] | null;
  therapist_approaches: { approach: CatalogItem | null }[] | null;
};

async function getTherapist(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("therapists")
    .select(
      `id, slug, display_name, city, zona, tagline, bio, languages, client_niches,
       is_online_available, price_min, price_max, verification_status,
       therapist_specialties ( specialty:specialties ( slug, nombre_coloquial, descripcion_coloquial ) ),
       therapist_approaches ( approach:therapeutic_approaches ( slug, nombre_coloquial, descripcion_coloquial ) )`
    )
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  return data as unknown as TherapistDetail | null;
}

function initialsFrom(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function priceLabel(min: number | null, max: number | null) {
  if (min) return `desde $${Math.round(min)} MXN / sesión`;
  if (max) return `hasta $${Math.round(max)} MXN / sesión`;
  return "Tarifa a consultar";
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const therapist = await getTherapist(slug);
  if (!therapist) return { title: "Terapeuta no encontrado" };
  const description = therapist.tagline ?? "Perfil de terapeuta verificado en Lemy.";
  return {
    title: therapist.display_name,
    description,
    openGraph: { title: therapist.display_name, description },
  };
}

const WEEKDAY_LABELS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

function formatSlotDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  // Fecha "de calendario" sin componente de hora, para no arrastrar
  // corrimientos de zona horaria al mostrarla.
  const weekday = WEEKDAY_LABELS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${weekday} ${d}/${m}`;
}

export default async function TherapistProfilePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { solicitado, ocupado, error } = await searchParams;
  const therapist = await getTherapist(slug);
  if (!therapist) notFound();

  const supabase = await createClient();
  const slots = await getAvailableSlots(supabase, therapist.id);
  const slotsByDate = new Map<string, typeof slots>();
  for (const slot of slots) {
    const list = slotsByDate.get(slot.date) ?? [];
    list.push(slot);
    slotsByDate.set(slot.date, list);
  }

  const specialties = (therapist.therapist_specialties ?? [])
    .map((s) => s.specialty)
    .filter((s): s is CatalogItem => Boolean(s));
  const approaches = (therapist.therapist_approaches ?? [])
    .map((a) => a.approach)
    .filter((a): a is CatalogItem => Boolean(a));

  const personJsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: therapist.display_name,
    jobTitle: "Psicoterapeuta",
    description: therapist.bio ?? therapist.tagline ?? undefined,
    url: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://lemy.mx"}/terapeuta/${therapist.slug}`,
    knowsAbout: specialties.map((s) => s.nombre_coloquial),
    address: therapist.city
      ? { "@type": "PostalAddress", addressLocality: therapist.city, addressCountry: "MX" }
      : undefined,
  };

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
      />
      <SiteHeader />
      <QuizFloatingTab />

      <main>
        <section className="px-6 py-16 sm:px-8 md:py-20">
          <div className="mx-auto max-w-[1180px]">
            <Link href="/buscar" className="text-[0.85rem] font-medium text-forest hover:text-rose-deep">
              ← Volver al buscador
            </Link>

            <ScrollReveal className="mt-6">
              <div className="signature-corner grid grid-cols-1 gap-10 rounded-[36px] border border-line bg-card p-8 md:grid-cols-[0.85fr_1.15fr] md:gap-12 md:p-13">
                <div className="border-b border-line pb-7 md:border-b-0 md:border-r md:pb-0 md:pr-11">
                  <div className="flex h-[100px] w-[100px] items-center justify-center rounded-full bg-gradient-to-br from-rose to-rose-deep font-display text-3xl font-semibold text-white">
                    {initialsFrom(therapist.display_name)}
                  </div>
                  <h1 className="mt-4.5 font-display text-[1.4rem] text-forest">{therapist.display_name}</h1>
                  {therapist.tagline && (
                    <p className="mt-1 font-mono text-[0.85rem] text-rose-deep">{therapist.tagline}</p>
                  )}
                  {therapist.verification_status === "verified" && (
                    <p className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-forest/[0.08] px-3 py-1 font-mono text-[0.72rem] text-forest">
                      ✓ Cédula verificada
                    </p>
                  )}

                  <div className="mt-5.5 space-y-2.5 text-[0.88rem] text-[#3E4B44]">
                    {approaches.length > 0 && (
                      <div>
                        <strong className="mr-2.5 inline-block min-w-[110px] font-semibold text-forest">
                          Enfoque
                        </strong>
                        {approaches.map((a) => a.nombre_coloquial).join(", ")}
                      </div>
                    )}
                    {(therapist.zona || therapist.city) && (
                      <div>
                        <strong className="mr-2.5 inline-block min-w-[110px] font-semibold text-forest">
                          Ubicación
                        </strong>
                        {[therapist.zona, therapist.city].filter(Boolean).join(", ")}
                      </div>
                    )}
                    <div>
                      <strong className="mr-2.5 inline-block min-w-[110px] font-semibold text-forest">
                        Modalidad
                      </strong>
                      {therapist.is_online_available ? "Online" : "Presencial"}
                    </div>
                    {therapist.languages && therapist.languages.length > 0 && (
                      <div>
                        <strong className="mr-2.5 inline-block min-w-[110px] font-semibold text-forest">
                          Idiomas
                        </strong>
                        {therapist.languages.join(", ")}
                      </div>
                    )}
                    <div>
                      <strong className="mr-2.5 inline-block min-w-[110px] font-semibold text-forest">
                        Tarifa
                      </strong>
                      {priceLabel(therapist.price_min, therapist.price_max)}
                    </div>
                  </div>

                  <Button href="#agenda" variant="primary" className="mt-6 w-full">
                    Agendar consulta
                  </Button>
                </div>

                <div>
                  {therapist.bio && (
                    <>
                      <h4 className="mb-2.5 font-mono text-[0.75rem] uppercase tracking-[0.1em] text-rose-deep">
                        Sobre mí
                      </h4>
                      <p className="mb-6.5 text-[0.96rem] text-[#37433D]">{therapist.bio}</p>
                    </>
                  )}

                  {specialties.length > 0 && (
                    <>
                      <h4 className="mb-2.5 font-mono text-[0.75rem] uppercase tracking-[0.1em] text-rose-deep">
                        Trabaja contigo si buscas
                      </h4>
                      <div className="mb-6.5 flex flex-wrap gap-2">
                        {specialties.map((s) => (
                          <Tag key={s.slug}>{s.nombre_coloquial}</Tag>
                        ))}
                      </div>
                    </>
                  )}

                  {therapist.client_niches && therapist.client_niches.length > 0 && (
                    <>
                      <h4 className="mb-2.5 font-mono text-[0.75rem] uppercase tracking-[0.1em] text-rose-deep">
                        A quién atiende
                      </h4>
                      <p className="text-[0.96rem] text-[#37433D]">{therapist.client_niches.join(", ")}</p>
                    </>
                  )}
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal className="mt-10">
              <div id="agenda" className="signature-corner rounded-[36px] border border-line bg-card p-8 md:p-13">
                <p className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-rose-deep">
                  Agenda tu sesión
                </p>
                <h2 className="mt-2.5 font-display text-[1.4rem] text-forest">
                  Elige un horario disponible
                </h2>

                {solicitado === "1" && (
                  <p className="mt-4 rounded-2xl border border-line bg-forest/[0.06] px-5 py-3 text-[0.9rem] text-forest">
                    Listo, tu solicitud quedó registrada. {therapist.display_name.split(" ")[0]} la va a
                    confirmar y te llegará el enlace de la sesión.
                  </p>
                )}
                {ocupado === "1" && (
                  <p className="mt-4 rounded-2xl border border-rose-deep/40 bg-rose/10 px-5 py-3 text-[0.9rem] text-rose-deep">
                    Justo se ocupó ese horario. Elige otro de la lista.
                  </p>
                )}
                {error === "1" && (
                  <p className="mt-4 rounded-2xl border border-rose-deep/40 bg-rose/10 px-5 py-3 text-[0.9rem] text-rose-deep">
                    Algo no salió bien, intenta de nuevo.
                  </p>
                )}

                {slotsByDate.size === 0 ? (
                  <p className="mt-5 text-[0.92rem] text-[#42504A]">
                    {therapist.display_name.split(" ")[0]} todavía no tiene horarios disponibles
                    cargados. Vuelve a revisar en unos días.
                  </p>
                ) : (
                  <div className="mt-6 space-y-5">
                    {Array.from(slotsByDate.entries()).map(([date, daySlots]) => (
                      <div key={date}>
                        <p className="mb-2.5 font-mono text-[0.75rem] uppercase tracking-[0.08em] text-[#5A665F]">
                          {formatSlotDate(date)}
                        </p>
                        <div className="flex flex-wrap gap-2.5">
                          {daySlots.map((slot) => (
                            <form key={slot.scheduledAtUtc} action={requestAppointment}>
                              <input type="hidden" name="therapist_slug" value={therapist.slug} />
                              <input type="hidden" name="scheduled_at" value={slot.scheduledAtUtc} />
                              <button
                                type="submit"
                                className="rounded-full border border-line bg-sage-white px-4 py-2 font-mono text-[0.82rem] text-forest transition-all duration-200 hover:border-forest hover:bg-forest hover:text-sage-white"
                              >
                                {slot.startTime}
                              </button>
                            </form>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ScrollReveal>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
