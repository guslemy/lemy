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
    await supabase.from("profiles").insert({
      id: user.id,
      full_name: user.user_metadata?.full_name ?? user.email,
      avatar_url: user.user_metadata?.avatar_url ?? null,
      role: "patient", // por default; el cambio a "therapist" se hace en onboarding
    });
  }
}
