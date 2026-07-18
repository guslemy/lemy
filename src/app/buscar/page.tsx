import type { Metadata } from "next";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { TherapistCard, type TherapistCardData } from "@/components/therapist-card";
import { QuizFloatingTab } from "@/components/quiz-floating-tab";

// Buscador con filtros — corazón del diferenciador.
// Filtros (texto libre + especialidad) se resuelven por query params, así el
// resultado siempre es enlazable y funciona sin JavaScript en el cliente.

type Specialty = { slug: string; nombre_coloquial: string };
type SpecialtyCatalogEntry = { id: string; slug: string; nombre_coloquial: string };

type RawTherapist = {
  slug: string;
  display_name: string;
  tagline: string | null;
  city: string | null;
  price_min: number | null;
  price_max: number | null;
  is_online_available: boolean;
  photo_url: string | null;
  therapist_specialties: { specialty: Specialty | null }[] | null;
};

type EducationalVideo = { id: string; title: string; platform: string; url: string };

// Los videos ahora se relacionan con especialidades vía una tabla puente
// (un video puede hablar de varios temas), así que la búsqueda va en dos
// pasos: primero los content_id que tocan esta especialidad, luego los
// videos en sí, ordenados por más recientes.
async function getVideosForSpecialty(
  supabase: SupabaseClient,
  specialtyId: string
): Promise<EducationalVideo[]> {
  const { data: links } = await supabase
    .from("educational_content_specialties")
    .select("content_id")
    .eq("specialty_id", specialtyId);

  const contentIds = (links ?? []).map((l) => l.content_id as string);
  if (!contentIds.length) return [];

  const { data: rawVideos } = await supabase
    .from("educational_content")
    .select("id, title, platform, url")
    .in("id", contentIds)
    .order("created_at", { ascending: false })
    .limit(3);

  return (rawVideos ?? []) as unknown as EducationalVideo[];
}

function pillHref(q: string, especialidad: string) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (especialidad) params.set("especialidad", especialidad);
  const qs = params.toString();
  return `/buscar${qs ? `?${qs}` : ""}`;
}

// Cada especialidad filtrada es una URL propia e indexable — el título y la
// descripción cambian según lo que se busque, en el mismo lenguaje coloquial
// que usa la gente real al buscar en Google (no jerga clínica).
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ especialidad?: string }>;
}): Promise<Metadata> {
  const { especialidad } = await searchParams;
  if (!especialidad) {
    return {
      title: "Buscar terapeuta en Oaxaca",
      description:
        "Filtra terapeutas verificados en Oaxaca por lo que necesitas trabajar: ansiedad, pareja, duelo, autoestima y más.",
    };
  }

  const supabase = await createClient();
  const { data: specialty } = await supabase
    .from("specialties")
    .select("nombre_coloquial, descripcion_coloquial")
    .eq("slug", especialidad)
    .maybeSingle();

  if (!specialty) return { title: "Buscar terapeuta en Oaxaca" };

  return {
    title: `Terapeuta para ${specialty.nombre_coloquial.toLowerCase()} en Oaxaca`,
    description:
      specialty.descripcion_coloquial ??
      `Encuentra terapeutas verificados en Oaxaca especializados en ${specialty.nombre_coloquial.toLowerCase()}.`,
  };
}

export default async function BuscarPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; especialidad?: string }>;
}) {
  const { q = "", especialidad = "" } = await searchParams;
  const supabase = await createClient();

  const [{ data: rawSpecialties }, { data: rawTherapists }] = await Promise.all([
    supabase.from("specialties").select("id, slug, nombre_coloquial").order("nombre_coloquial"),
    supabase
      .from("therapists")
      .select(
        "slug, display_name, tagline, city, price_min, price_max, is_online_available, photo_url, therapist_specialties ( specialty:specialties ( slug, nombre_coloquial ) )"
      )
      .eq("is_published", true),
  ]);

  const specialties = (rawSpecialties ?? []) as unknown as SpecialtyCatalogEntry[];
  const activeSpecialty = specialties.find((s) => s.slug === especialidad) ?? null;

  const videos = activeSpecialty ? await getVideosForSpecialty(supabase, activeSpecialty.id) : null;

  const therapists = ((rawTherapists ?? []) as unknown as RawTherapist[]).map((t) => {
    const specs = (t.therapist_specialties ?? [])
      .map((ts) => ts.specialty)
      .filter((s): s is Specialty => Boolean(s));

    const card: TherapistCardData & { specialtySlugs: string[] } = {
      slug: t.slug,
      display_name: t.display_name,
      tagline: t.tagline,
      city: t.city,
      price_min: t.price_min,
      price_max: t.price_max,
      is_online_available: t.is_online_available,
      photo_url: t.photo_url,
      specialties: specs.map((s) => s.nombre_coloquial),
      specialtySlugs: specs.map((s) => s.slug),
    };
    return card;
  });

  const term = q.trim().toLowerCase();
  const filtered = therapists.filter((t) => {
    const matchesEspecialidad = !especialidad || t.specialtySlugs.includes(especialidad);
    const matchesQ =
      !term ||
      t.display_name.toLowerCase().includes(term) ||
      (t.tagline ?? "").toLowerCase().includes(term) ||
      (t.city ?? "").toLowerCase().includes(term) ||
      t.specialties.some((s) => s.toLowerCase().includes(term));
    return matchesEspecialidad && matchesQ;
  });

  return (
    <>
      <SiteHeader />
      <QuizFloatingTab />

      <main>
        <section className="px-6 pb-10 pt-16 sm:px-8 md:pt-20">
          <div className="mx-auto max-w-[1180px]">
            <p className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-rose-deep">Directorio</p>
            <h1 className="mt-2.5 font-display text-[2rem] font-medium leading-[1.12] text-forest sm:text-[2.6rem]">
              Encuentra a quien sí va a <em className="not-italic italic text-rose-deep">escucharte</em>
            </h1>
            <p className="mt-3.5 max-w-[560px] text-[1.02rem] text-[#3E4B44]">
              Filtra por lo que necesitas trabajar. Cada perfil incluye formación, enfoque y modalidad.
            </p>

            <form
              action="/buscar"
              className="mt-8 flex max-w-[520px] gap-2 rounded-full border border-line bg-card py-1.5 pl-5 pr-1.5 shadow-[var(--shadow-signature)]"
            >
              {especialidad && <input type="hidden" name="especialidad" value={especialidad} />}
              <input
                type="text"
                name="q"
                defaultValue={q}
                placeholder="¿Qué te gustaría trabajar? Ej. ansiedad, pareja…"
                className="flex-1 bg-transparent text-[0.98rem] text-ink outline-none placeholder:text-[#8B978F]"
              />
              <Button type="submit" variant="primary">
                Buscar
              </Button>
            </form>

            <div className="mt-5 flex flex-wrap gap-2.5">
              <Pill href={pillHref(q, "")} active={!especialidad}>
                Todos
              </Pill>
              {(specialties ?? []).map((s) => (
                <Pill key={s.slug} href={pillHref(q, s.slug)} active={especialidad === s.slug}>
                  {s.nombre_coloquial}
                </Pill>
              ))}
            </div>
          </div>
        </section>

        <section className="py-12 md:py-16">
          <div className="mx-auto max-w-[1180px] px-6 sm:px-8">
            {activeSpecialty && videos && videos.length > 0 && (
              <div className="mb-11">
                <p className="mb-3 font-mono text-[0.72rem] uppercase tracking-[0.14em] text-rose-deep">
                  Antes de agendar
                </p>
                <h2 className="mb-5 font-display text-[1.3rem] text-forest">
                  Entiende mejor cómo te sientes
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {videos.map((v) => (
                    <a
                      key={v.id}
                      href={v.url}
                      target="_blank"
                      rel="noreferrer"
                      className="signature-corner rounded-[20px] border border-line bg-card p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-signature)]"
                    >
                      <span className="font-mono text-[0.7rem] uppercase tracking-[0.08em] text-rose-deep">
                        {v.platform}
                      </span>
                      <p className="mt-2 text-[0.92rem] text-forest">{v.title}</p>
                      <p className="mt-3 text-[0.82rem] font-semibold text-forest">Ver video ↗</p>
                    </a>
                  ))}
                </div>
              </div>
            )}

            <p className="mb-6 text-[0.9rem] text-[#5A665F]">
              {filtered.length} {filtered.length === 1 ? "terapeuta encontrado" : "terapeutas encontrados"}
            </p>

            {filtered.length === 0 ? (
              <div className="signature-corner rounded-[28px] border border-line bg-card p-10 text-center">
                <p className="font-display text-[1.3rem] text-forest">Todavía no hay resultados por aquí</p>
                <p className="mx-auto mt-2.5 max-w-[440px] text-[0.95rem] text-[#42504A]">
                  Estamos incorporando a los primeros terapeutas verificados de Lemy. Vuelve pronto o
                  ajusta tu búsqueda.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((t, i) => (
                  <TherapistCard key={t.slug} t={t} index={i} />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
