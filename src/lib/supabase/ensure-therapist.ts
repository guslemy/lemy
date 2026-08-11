import type { SupabaseClient, User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { slugify } from "@/lib/slugify";
import { RESERVED_SLUGS } from "@/lib/reserved-slugs";

// Genera un slug único para un terapeuta, agregando un sufijo numérico si ya
// existe (o si el propio terapeuta lo está cambiando y choca con otro), o si
// coincide con una ruta reservada del sitio (ver reserved-slugs.ts).
export async function uniqueTherapistSlug(
  supabase: SupabaseClient,
  name: string,
  ownId: string
): Promise<string> {
  const base = slugify(name) || "terapeuta";
  let candidate = RESERVED_SLUGS.has(base) ? `${base}-terapia` : base;
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

  // Programa de referidos: si esta persona llegó con un link tipo
  // lemy.mx/api/ref?code=<slug>, hay una cookie con el slug de quien la
  // invitó — la resolvemos aquí, en el único momento en que de verdad se
  // crea la fila (esta función es idempotente, no vuelve a correr después).
  let referredBy: string | null = null;
  try {
    const cookieStore = await cookies();
    const refCode = cookieStore.get("lemy_ref")?.value;
    if (refCode && refCode !== slug) {
      const { data: referrer } = await supabase
        .from("therapists")
        .select("id")
        .eq("slug", refCode)
        .maybeSingle();
      referredBy = referrer?.id ?? null;
    }
  } catch {
    // cookies() puede no estar disponible en algún contexto — nunca debe
    // tumbar la creación de la cuenta por esto.
  }

  await supabase.from("therapists").insert({
    id: user.id,
    slug,
    display_name: baseName,
    referred_by: referredBy,
  });
}
