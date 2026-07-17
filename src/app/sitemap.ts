import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

// Cliente anónimo simple — un sitemap no tiene usuario ni sesión, así que
// no necesita el cliente basado en cookies (createServerClient de @/lib/
// supabase/server). Solo lee datos ya públicos (RLS igual los protegería).
function publicClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://lemy.mx";

// Se regenera cada hora — sin esto quedaría fijo con los terapeutas que
// había en el momento del build, y no reflejaría altas nuevas hasta el
// siguiente deploy.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = publicClient();

  const [{ data: specialties }, { data: therapists }] = await Promise.all([
    supabase.from("specialties").select("slug"),
    supabase.from("therapists").select("slug").eq("is_published", true),
  ]);

  const staticEntries: MetadataRoute.Sitemap = [
    { url: BASE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE_URL}/buscar`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/login`, changeFrequency: "monthly", priority: 0.3 },
  ];

  // Long-tail: cada especialidad filtrada es su propia URL indexable — así
  // es como la gente busca de verdad ("terapia para ansiedad"), no con
  // jerga clínica genérica.
  const specialtyEntries: MetadataRoute.Sitemap = (specialties ?? []).map((s) => ({
    url: `${BASE_URL}/buscar?especialidad=${s.slug}`,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  const therapistEntries: MetadataRoute.Sitemap = (therapists ?? []).map((t) => ({
    url: `${BASE_URL}/terapeuta/${t.slug}`,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticEntries, ...specialtyEntries, ...therapistEntries];
}
