import type { SupabaseClient } from "@supabase/supabase-js";

// Un perfil "completo" para poder reservar necesita nombre real (no solo el
// correo que a veces usamos como placeholder en ensureProfile) y un teléfono
// con el que se pueda contactar al paciente sobre su cita. El correo ya lo
// tenemos siempre vía auth.users, así que no hace falta pedirlo aparte.
export function isValidName(name: string | null | undefined): boolean {
  return !!name && name.trim().length >= 2;
}

export function isValidPhone(phone: string | null | undefined): boolean {
  if (!phone) return false;
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

export async function hasCompleteProfile(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone")
    .eq("id", userId)
    .maybeSingle();

  return isValidName(profile?.full_name as string | null | undefined) && isValidPhone(profile?.phone as string | null | undefined);
}
