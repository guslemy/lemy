import type { SupabaseClient } from "@supabase/supabase-js";

export type CancelRole = "patient" | "therapist";

// Cancela una cita en nombre de quien la pide, siempre y cuando esa persona
// sea de verdad uno de los dos participantes (terapeuta o paciente) — el
// filtro .eq(column, userId) hace que RLS y esta validación coincidan.
// No se puede cancelar algo que ya está cancelado o completado.
export async function cancelAppointmentAsParticipant(
  supabase: SupabaseClient,
  userId: string,
  appointmentId: string,
  role: CancelRole,
  reason: string | null
): Promise<{ ok: boolean }> {
  const column = role === "patient" ? "patient_id" : "therapist_id";

  const { data: appointment } = await supabase
    .from("appointments")
    .select("id, status")
    .eq("id", appointmentId)
    .eq(column, userId)
    .maybeSingle();

  if (!appointment) return { ok: false };
  if (appointment.status === "cancelled" || appointment.status === "completed") {
    return { ok: false };
  }

  const { error } = await supabase
    .from("appointments")
    .update({
      status: "cancelled",
      cancelled_by: role,
      cancellation_reason: reason,
      cancelled_at: new Date().toISOString(),
    })
    .eq("id", appointmentId)
    .eq(column, userId);

  return { ok: !error };
}
