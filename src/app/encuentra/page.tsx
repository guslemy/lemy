import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import type { MatchTherapist } from "@/lib/questionnaire";
import { QuizClient } from "./quiz-client";

// Cuestionario de match — pantalla de entrada.
// Server component: solo trae el catálogo de especialidades (para que las
// opciones de "qué te gustaría trabajar" siempre reflejen todas las
// categorías reales del sitio, sin tener que mantener una lista aparte) y
// los terapeutas publicados. Todo el flujo de preguntas vive en el cliente
// y no se guarda nada en la base de datos — ver src/lib/questionnaire.ts.

export const metadata: Metadata = {
  title: "Encuentra a tu terapeuta ideal",
  description:
    "Un cuestionario corto y anónimo para ayudarte a encontrar al terapeuta correcto en Oaxaca. Sin cuenta, sin datos, sin complicaciones.",
};

type RawTherapist = {
  slug: string;
  display_name: string;
  tagline: string | null;
  city: string | null;
  price_min: number | null;
  price_max: number | null;
  is_online_available: boolean;
  gender: string | null;
  client_niches: string[] | null;
  therapist_specialties: { specialty: { slug: string; nombre_coloquial: string } | null }[] | null;
};

export default async function EncuentraPage() {
  const supabase = await createClient();

  const [{ data: rawSpecialties }, { data: rawTherapists }] = await Promise.all([
    supabase
      .from("specialties")
      .select("slug, nombre_coloquial, descripcion_coloquial")
      .order("nombre_coloquial"),
    supabase
      .from("therapists")
      .select(
        `slug, display_name, tagline, city, price_min, price_max, is_online_available, gender, client_niches,
         therapist_specialties ( specialty:specialties ( slug, nombre_coloquial ) )`
      )
      .eq("is_published", true),
  ]);

  const specialties = (rawSpecialties ?? []) as {
    slug: string;
    nombre_coloquial: string;
    descripcion_coloquial: string | null;
  }[];

  const therapists: MatchTherapist[] = ((rawTherapists ?? []) as unknown as RawTherapist[]).map((t) => {
    const specs = (t.therapist_specialties ?? [])
      .map((ts) => ts.specialty)
      .filter((s): s is { slug: string; nombre_coloquial: string } => Boolean(s));

    return {
      slug: t.slug,
      display_name: t.display_name,
      tagline: t.tagline,
      city: t.city,
      price_min: t.price_min,
      price_max: t.price_max,
      is_online_available: t.is_online_available,
      gender: t.gender,
      client_niches: t.client_niches,
      specialtySlugs: specs.map((s) => s.slug),
      specialtyNames: specs.map((s) => s.nombre_coloquial),
    };
  });

  return (
    <>
      <SiteHeader />
      <main>
        <QuizClient specialties={specialties} therapists={therapists} />
      </main>
      <SiteFooter />
    </>
  );
}
