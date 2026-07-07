import type { SupabaseClient, User } from "@supabase/supabase-js";
import { slugify } from "@/lib/slugify";

// Genera un slug único para un terapeuta, agregando un sufijo numérico si ya
// existe (o si el propio terapeuta lo está cambiando y choca con otro).
export async function uniqueTherapistSlug(
  supabase: SupabaseClient,
  name: string,
  ownId: string
): Promise<string> {
  const base = slugify(name) || "terapeuta";
  let candidate = base;
  let attempt = 1;

  while (attempt < 25) {
    const { data } = await supabase
      .from("therapists")
      .select("id")
      .eq("slug", candidate)
      .neq("id", ownId)
      .maybeSingle();

    if (!data) return candidate;
    attempt += 1;
    candidate = `${base}-${attempt}`;
  }

  return `${base}-${Date.now()}`;
}

// Crea el registro base en `therapists` la primera vez que alguien activa su
// cuenta como terapeuta. Sin esto, no hay fila donde guardar el resto del
// perfil ni RLS que le permita al usuario ver/editar "lo suyo".
export async function ensureTherapistShell(supabase: SupabaseClient, user: User) {
  const { data: existing } = await supabase
    .from("therapists")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (existing) return;

  const baseName = (user.user_metadata?.full_name as string | undefined) ?? "Terapeuta";
  const slug = await uniqueTherapistSlug(supabase, baseName, user.id);

  await supabase.from("therapists").insert({
    id: user.id,
    slug,
    display_name: baseName,
  });
}
