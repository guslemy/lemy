import type { Metadata } from "next";
import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { TherapistCard, type TherapistCardData } from "@/components/therapist-card";
import { QuizFloatingTab } from "@/components/quiz-floating-tab";
import { getRatingsByTherapistId } from "@/lib/reviews";

// Buscador con filtros — corazón del diferenciador.
// Filtros (texto libre + especialidad) se resuelven por query params, así el
// resultado siempre es enlazable y funciona sin JavaScript en el cliente.

type Specialty = { slug: string; nombre_coloquial: string };
type SpecialtyCatalogEntry = { id: string; slug: string; nombre_coloquial: string };

type RawTherapist = {
  id: string;
  slug: string;
  display_name: string;
  tagline: string | null;
  city: string | null;
  price_min: number | null;
  price_max: number | null;
  is_online_available: boolean;
  is_in_person_available: boolean;
  photo_url: string | null;
  verification_status: string;
  therapist_specialties: { specialty: Specialty | null }[] | null;
};

type EducationalVideo = { id: string; title: string; platform: string; url: string };

// Los videos ahora se relacionan con especialidades vía una tabla puente
// (un video puede hablar de varios temas), así que la búsqueda va en dos
// pasos: primero los content_id que tocan esta especialidad, luego los
// videos en sí, ordenados por más recientes.
async function getVideosForSpecialties(
  supabase: SupabaseClient,
  specialtyIds: string[]
): Promise<EducationalVideo[]> {
  const { data: links } = await supabase
    .from("educational_content_specialties")
    .select("content_id")
    .in("specialty_id", specialtyIds);

  const contentIds = [...new Set((links ?? []).map((l) => l.content_id as string))];
  if (!contentIds.length) return [];

  const { data: rawVideos } = await supabase
    .from("educational_content")
    .select("id, title, platform, url")
    .in("id", contentIds)
    .order("created_at", { ascending: false })
    .limit(3);

  return (rawVideos ?? []) as unknown as EducationalVideo[];
}

// Las pills ahora son acumulativas (2026-10-09): cada clic suma o quita una
// especialidad de la lista (?especialidad=ansiedad,duelo). Entre más
// específico es lo que la persona siente, más específica la sugerencia.
// El texto de la barra sigue siendo independiente: al tocar una pill se
// limpia (la barra se vuelve a montar vacía, ver `key` del input), y al
// buscar por texto se limpian las pills — así nunca se queda en la barra
// una palabra que ya no está filtrando nada.
function parseSlugs(raw: string): string[] {
  return [...new Set(raw.split(",").map((x) => x.trim()).filter(Boolean))];
}

function pillHref(selected: string[], toggleSlug: string) {
  if (!toggleSlug) return "/buscar";
  const next = selected.includes(toggleSlug)
    ? selected.filter((x) => x !== toggleSlug)
    : [...selected, toggleSlug];
  return next.length ? `/buscar?especialidad=${next.map(encodeURIComponent).join(",")}` : "/buscar";
}

// Cada especialidad filtrada es una URL propia e indexable — el título y la
// descripción cambian según lo que se busque, en el mismo lenguaje coloquial
// que usa la gente real al buscar en Google (no jerga clínica).
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ especialidad?: string }>;
}): Promise<Metadata> {
  const { especialidad = "" } = await searchParams;
  const slugs = parseSlugs(especialidad);
  if (slugs.length === 0) {
    return {
      title: "Buscar terapeuta en Oaxaca",
      description:
        "Filtra terapeutas verificados en Oaxaca por lo que necesitas trabajar: ansiedad, pareja, duelo, autoestima y más.",
    };
  }

  const supabase = await createClient();

  // Combinaciones de varias especialidades: útiles para la persona, pero no
  // para Google (serían miles de URLs casi idénticas) — noindex, y el título
  // simplemente las nombra.
  if (slugs.length > 1) {
    const { data: specs } = await supabase
      .from("specialties")
      .select("nombre_coloquial")
      .in("slug", slugs);
    const names = (specs ?? []).map((x) => x.nombre_coloquial as string);
    return {
      title: `Terapeuta para ${names.join(" + ").toLowerCase()} en Oaxaca`,
      robots: { index: false, follow: true },
    };
  }

  const { data: specialty } = await supabase
    .from("specialties")
    .select("nombre_coloquial, descripcion_coloquial")
    .eq("slug", slugs[0])
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
        "id, slug, display_name, tagline, city, price_min, price_max, is_online_available, is_in_person_available, photo_url, verification_status, therapist_specialties ( specialty:specialties ( slug, nombre_coloquial ) )"
      )
      .eq("is_published", true),
  ]);

  const specialties = (rawSpecialties ?? []) as unknown as SpecialtyCatalogEntry[];
  const selectedSlugs = parseSlugs(especialidad).filter((slug) => specialties.some((s) => s.slug === slug));
  const activeSpecialties = specialties.filter((s) => selectedSlugs.includes(s.slug));

  const videos =
    activeSpecialties.length > 0
      ? await getVideosForSpecialties(supabase, activeSpecialties.map((s) => s.id))
      : null;

  const rawList = (rawTherapists ?? []) as unknown as RawTherapist[];
  const ratingsById = await getRatingsByTherapistId(supabase, rawList.map((t) => t.id));

  const therapists = rawList.map((t) => {
    const specs = (t.therapist_specialties ?? [])
      .map((ts) => ts.specialty)
      .filter((s): s is Specialty => Boolean(s));
    const rating = ratingsById.get(t.id);

    const card: TherapistCardData & { specialtySlugs: string[] } = {
      slug: t.slug,
      display_name: t.display_name,
      tagline: t.tagline,
      city: t.city,
      price_min: t.price_min,
      price_max: t.price_max,
      is_online_available: t.is_online_available,
      is_in_person_available: t.is_in_person_available,
      photo_url: t.photo_url,
      verified: t.verification_status === "verified",
      specialties: specs.map((s) => s.nombre_coloquial),
      specialtySlugs: specs.map((s) => s.slug),
      avgRating: rating?.avg ?? 0,
      reviewsCount: rating?.count ?? 0,
    };
    return card;
  });

  const term = q.trim().toLowerCase();
  // Con varias pills: se muestra quien coincide con AL MENOS una, ordenado de
  // mayor a menor número de coincidencias — así más pills = sugerencia más
  // precisa arriba, sin quedarse en cero resultados mientras el directorio
  // es chico. (Para exigir TODAS las pills, cambiar `>= 1` por
  // `=== selectedSlugs.length`.)
  const matchCount = (t: { specialtySlugs: string[] }) =>
    selectedSlugs.filter((slug) => t.specialtySlugs.includes(slug)).length;

  const filtered = therapists
    .filter((t) => {
    const matchesEspecialidad = selectedSlugs.length === 0 || matchCount(t) >= 1;
    const matchesQ =
      !term ||
      t.display_name.toLowerCase().includes(term) ||
      (t.tagline ?? "").toLowerCase().includes(term) ||
      (t.city ?? "").toLowerCase().includes(term) ||
      t.specialties.some((s) => s.toLowerCase().includes(term));
    return matchesEspecialidad && matchesQ;
    })
    .sort((a, b) => matchCount(b) - matchCount(a));

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
              <input
                type="text"
                name="q"
                // key: al cambiar la búsqueda o las pills, el input se vuelve a
                // montar — sin esto, en navegación del lado del cliente
                // conservaba lo escrito antes ("Duelo") aunque ya se hubiera
                // elegido otra pill.
                key={`${q}|${especialidad}`}
                defaultValue={q}
                placeholder="¿Qué te gustaría trabajar? Ej. ansiedad, pareja…"
                className="flex-1 bg-transparent text-[0.98rem] text-ink outline-none placeholder:text-[#8B978F]"
              />
              <Button type="submit" variant="primary">
                Buscar
              </Button>
            </form>

            <div className="mt-5 flex flex-wrap gap-2.5">
              <Pill href={pillHref([], "")} active={selectedSlugs.length === 0}>
                Todos
              </Pill>
              {(specialties ?? []).map((s) => (
                <Pill key={s.slug} href={pillHref(selectedSlugs, s.slug)} active={selectedSlugs.includes(s.slug)}>
                  {s.nombre_coloquial}
                </Pill>
              ))}
            </div>
          </div>
        </section>

        <section className="py-12 md:py-16">
          <div className="mx-auto max-w-[1180px] px-6 sm:px-8">
            {activeSpecialties.length > 0 && videos && videos.length > 0 && (
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
                <p className="font-display text-[1.3rem] text-forest">No encontramos nada con esas búsqueda.</p>
                <p className="mx-auto mt-2.5 max-w-[440px] text-[0.95rem] text-[#42504A]">
                  Usa otras palabras para describir lo que sientes, o usa nuestro{" "}
                  <Link href="/test" className="font-semibold text-rose-deep underline">
                    Test de afinidad
                  </Link>
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((t, i) => (
                  <div key={t.slug}>
                    {selectedSlugs.length > 1 && (
                      <p className="mb-2 pl-1 font-mono text-[0.7rem] text-rose-deep">
                        Coincide con {matchCount(t)} de {selectedSlugs.length}
                      </p>
                    )}
                    <TherapistCard t={t} index={i} />
                  </div>
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
