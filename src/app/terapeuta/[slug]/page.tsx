import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ScrollReveal } from "@/components/scroll-reveal";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/pill";

// Perfil público de un terapeuta. Solo visible si is_published = true
// (lo aplica la RLS "therapists_public_read" además del filtro explícito aquí).
// Nota: no leemos therapist_credentials aquí — su RLS es owner-only, un
// visitante anónimo nunca vería esas filas de todos modos. El badge de
// "verificado" sale directo del campo verification_status en therapists.

type Props = { params: Promise<{ slug: string }> };

type CatalogItem = { slug: string; nombre_coloquial: string; descripcion_coloquial: string | null };

type TherapistDetail = {
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
      `slug, display_name, city, zona, tagline, bio, languages, client_niches,
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
  if (!therapist) return { title: "Terapeuta no encontrado — Lemy" };
  return {
    title: `${therapist.display_name} — Lemy`,
    description: therapist.tagline ?? "Perfil de terapeuta verificado en Lemy.",
  };
}

export default async function TherapistProfilePage({ params }: Props) {
  const { slug } = await params;
  const therapist = await getTherapist(slug);
  if (!therapist) notFound();

  const specialties = (therapist.therapist_specialties ?? [])
    .map((s) => s.specialty)
    .filter((s): s is CatalogItem => Boolean(s));
  const approaches = (therapist.therapist_approaches ?? [])
    .map((a) => a.approach)
    .filter((a): a is CatalogItem => Boolean(a));

  return (
    <>
      <SiteHeader />

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

                  <Button href="/login" variant="primary" className="mt-6 w-full">
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
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
