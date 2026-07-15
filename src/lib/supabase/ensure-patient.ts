import type { SupabaseClient } from "@supabase/supabase-js";

// Crea el registro base en `patients` la primera vez que alguien reserva
// una sesión (por default todos los usuarios nuevos son "patient" en
// `profiles`, pero eso no crea automáticamente la fila en `patients`).
export async function ensurePatientShell(supabase: SupabaseClient, userId: string) {
  const { data: existing } = await supabase.from("patients").select("id").eq("id", userId).maybeSingle();
  if (existing) return;
  await supabase.from("patients").insert({ id: userId });
}
