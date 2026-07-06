import { createClient } from "@/lib/supabase/server";

// Buscador con filtros — corazón del diferenciador.
// Por ahora: listado simple de terapeutas publicados, sin filtros aún (siguiente paso).
export default async function BuscarPage() {
  const supabase = await createClient();
  const { data: therapists } = await supabase
    .from("therapists")
    .select("id, display_name, tagline, city, price_min, price_max, is_online_available")
    .eq("is_published", true);

  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="mb-6 text-2xl font-semibold text-[#0f3d3e]">Encuentra a tu terapeuta</h1>

      {!therapists?.length && (
        <p className="text-neutral-600">
          Todavía no hay terapeutas publicados. (Esto es esperado: aún no hemos
          cargado los 10 perfiles iniciales.)
        </p>
      )}

      <ul className="space-y-4">
        {therapists?.map((t) => (
          <li key={t.id} className="rounded-xl border border-neutral-200 bg-white p-4">
            <p className="font-medium">{t.display_name}</p>
            {t.tagline && <p className="text-sm text-neutral-600">{t.tagline}</p>}
            <p className="text-sm text-neutral-500">{t.city}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
