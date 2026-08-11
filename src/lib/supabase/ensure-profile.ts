import type { SupabaseClient, User } from "@supabase/supabase-js";

// Crea el registro en `profiles` la primera vez que un usuario entra,
// sin importar si vino por Google o por correo/contraseña.
export async function ensureProfile(supabase: SupabaseClient, user: User) {
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (!existingProfile) {
    // Cualquier cuenta con correo @lemy.mx es del equipo — entra directo
    // como admin, sin que Gustavo tenga que ponerlo a mano en Supabase cada
    // vez que alguien nuevo del equipo se registra.
    const isLemyTeam = (user.email ?? "").toLowerCase().endsWith("@lemy.mx");

    await supabase.from("profiles").insert({
      id: user.id,
      full_name: user.user_metadata?.full_name ?? user.email,
      avatar_url: user.user_metadata?.avatar_url ?? null,
      // Google normalmente no manda teléfono, pero por si algún proveedor sí
      // lo trae (o si signUp con correo/contraseña lo pasó en options.data).
      phone: user.user_metadata?.phone ?? null,
      role: isLemyTeam ? "admin" : "patient", // por default paciente; therapist se activa en onboarding
    });
  }
}
