import type { SupabaseClient } from "@supabase/supabase-js";

// ¿Este terapeuta "tiene" a este paciente? Sí si hay al menos una cita entre
// ambos, O si lo importó (tabla therapist_patients, ver migración
// 0051_importador_de_pacientes). Antes solo contaban las citas. Se usa para
// que nadie entre a la ficha de un paciente ajeno adivinando su id.
export async function therapistHasPatient(
  supabase: SupabaseClient,
  therapistId: string,
  patientId: string
): Promise<boolean> {
  const { count } = await supabase
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("therapist_id", therapistId)
    .eq("patient_id", patientId);
  if (count) return true;

  // Si la tabla aún no existe (migración 0051 sin correr), error → false.
  const { count: imported, error } = await supabase
    .from("therapist_patients")
    .select("patient_id", { count: "exact", head: true })
    .eq("therapist_id", therapistId)
    .eq("patient_id", patientId);
  if (error) return false;
  return Boolean(imported);
}
