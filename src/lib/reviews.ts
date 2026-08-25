import type { SupabaseClient } from "@supabase/supabase-js";

export type RatingSummary = { avg: number; count: number };

// Promedio + conteo de reseñas publicadas por terapeuta, para tarjetas
// donde no vale la pena traer cada reseña completa (home, /buscar, test de
// afinidad) — solo el resumen. Un único query con `.in(...)` en vez de uno
// por terapeuta, para no volver O(n) las páginas con varias tarjetas.
export async function getRatingsByTherapistId(
  supabase: SupabaseClient,
  therapistIds: string[]
): Promise<Map<string, RatingSummary>> {
  if (!therapistIds.length) return new Map();

  const { data } = await supabase
    .from("reviews")
    .select("therapist_id, rating")
    .eq("is_published", true)
    .in("therapist_id", therapistIds);

  const ratingsById = new Map<string, number[]>();
  for (const r of data ?? []) {
    const id = r.therapist_id as string;
    const list = ratingsById.get(id) ?? [];
    list.push(r.rating as number);
    ratingsById.set(id, list);
  }

  const summaryById = new Map<string, RatingSummary>();
  for (const [id, ratings] of ratingsById) {
    summaryById.set(id, {
      avg: ratings.reduce((sum, r) => sum + r, 0) / ratings.length,
      count: ratings.length,
    });
  }
  return summaryById;
}
