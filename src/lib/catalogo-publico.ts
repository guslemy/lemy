import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import type { RatingSummary } from "@/lib/reviews";

// Datos públicos del directorio (/buscar) y la biblioteca, guardados en
// memoria del servidor unos minutos.
//
// Por qué existe (2026-11-15): entre el 9 y el 15 de noviembre el rastreador
// ClaudeBot (Anthropic) pidió /buscar ~465 mil veces, y cada visita le hacía
// 4-5 consultas a Supabase (especialidades, terapeutas, reseñas, videos). Eso
// fueron ~9 GB de egress por día en una base de 30 MB y agotó la cuota del plan
// gratis. Como estos datos son los mismos para todo el mundo y cambian pocas
// veces al día, no hace falta preguntarle a Supabase en cada visita: se
// consulta una vez cada REVALIDATE_SECONDS y el resto sale de memoria.
//
// Usa un cliente anónimo simple (sin cookies), igual que sitemap.ts: son datos
// ya públicos y RLS los sigue protegiendo.
//
// Efecto visible: un terapeuta que publica o edita su perfil, o un video
// nuevo, puede tardar hasta 5 minutos en aparecer en el directorio.

const REVALIDATE_SECONDS = 300;

function publicClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}

// Si Supabase falla, las funciones de arriba lanzan el error y unstable_cache NO
// guarda nada (así un fallo de un minuto no deja el directorio vacío 5 minutos).
// Estos envoltorios devuelven un valor vacío para que la página siga cargando.
async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    console.error("Error leyendo catálogo público:", err);
    return fallback;
  }
}

export type PublicSpecialty = {
  id: string;
  slug: string;
  nombre_coloquial: string;
  descripcion_coloquial: string | null;
};

export type PublicTherapist = {
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
  therapist_specialties:
    | { specialty: { slug: string; nombre_coloquial: string } | null }[]
    | null;
};

export type PublicVideoRow = {
  id: string;
  title: string;
  platform: string;
  url: string;
  thumbnail_url: string | null;
  created_at: string;
  educational_content_specialties:
    | { specialty_id: string; specialty: { nombre_coloquial: string } | null }[]
    | null;
};

const cachedSpecialties = unstable_cache(
  async (): Promise<PublicSpecialty[]> => {
    const { data, error } = await publicClient()
      .from("specialties")
      .select("id, slug, nombre_coloquial, descripcion_coloquial")
      .order("nombre_coloquial");
    if (error) throw error;
    return (data ?? []) as PublicSpecialty[];
  },
  ["catalogo-publico-specialties"],
  { revalidate: REVALIDATE_SECONDS }
);

const cachedPublishedTherapists = unstable_cache(
  async (): Promise<PublicTherapist[]> => {
    const { data, error } = await publicClient()
      .from("therapists")
      .select(
        "id, slug, display_name, tagline, city, price_min, price_max, is_online_available, is_in_person_available, photo_url, verification_status, therapist_specialties ( specialty:specialties ( slug, nombre_coloquial ) )"
      )
      .eq("is_published", true);
    if (error) throw error;
    return (data ?? []) as unknown as PublicTherapist[];
  },
  ["catalogo-publico-therapists"],
  { revalidate: REVALIDATE_SECONDS }
);

// Resumen de reseñas publicadas de TODOS los terapeutas (id → promedio y
// conteo). Se devuelve como arreglo porque unstable_cache serializa a JSON (un
// Map no sobrevive); getCachedRatings lo reconstruye.
const cachedRatingEntries = unstable_cache(
  async (): Promise<[string, RatingSummary][]> => {
    const { data, error } = await publicClient()
      .from("reviews")
      .select("therapist_id, rating")
      .eq("is_published", true);
    if (error) throw error;

    const byId = new Map<string, number[]>();
    for (const r of data ?? []) {
      const id = r.therapist_id as string;
      const list = byId.get(id) ?? [];
      list.push(r.rating as number);
      byId.set(id, list);
    }
    return Array.from(byId, ([id, ratings]) => [
      id,
      { avg: ratings.reduce((sum, r) => sum + r, 0) / ratings.length, count: ratings.length },
    ]);
  },
  ["catalogo-publico-ratings"],
  { revalidate: REVALIDATE_SECONDS }
);

export async function getCachedRatings(): Promise<Map<string, RatingSummary>> {
  return new Map(await safe(() => cachedRatingEntries(), []));
}

// Todos los videos educativos con las especialidades que tocan. La tabla es
// chica, así que en vez de una consulta por cada combinación de especialidades
// (que un rastreador puede inventar sin límite) se trae todo una vez y se
// filtra en memoria.
const cachedVideoRows = unstable_cache(
  async (): Promise<PublicVideoRow[]> => {
    const { data, error } = await publicClient()
      .from("educational_content")
      .select(
        "id, title, platform, url, thumbnail_url, created_at, educational_content_specialties ( specialty_id, specialty:specialties ( nombre_coloquial ) )"
      )
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as PublicVideoRow[];
  },
  ["catalogo-publico-videos"],
  { revalidate: REVALIDATE_SECONDS }
);

export const getCachedSpecialties = () => safe(() => cachedSpecialties(), [] as PublicSpecialty[]);
export const getCachedPublishedTherapists = () =>
  safe(() => cachedPublishedTherapists(), [] as PublicTherapist[]);
export const getCachedVideoRows = () => safe(() => cachedVideoRows(), [] as PublicVideoRow[]);
