import type { SupabaseClient } from "@supabase/supabase-js";
import { notifyAppointmentRequested } from "@/lib/notifications/instant";

export type CancelRole = "patient" | "therapist";

export type Modality = "online" | "presencial";

export type RequestAppointmentResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "taken" };

// Lógica compartida para crear una solicitud de cita — la usan tanto
// requestAppointment (terapeuta/[slug]/actions.ts) como completar-perfil/
// actions.ts (cuando el paciente termina de registrarse y la reserva
// original queda pendiente de completarse). Vive aquí para no duplicarla.
export async function requestAppointmentForUser(
  supabase: SupabaseClient,
  userId: string,
  therapistSlug: string,
  scheduledAt: string,
  requestedModality: Modality
): Promise<RequestAppointmentResult> {
  const { data: therapist } = await supabase
    .from("therapists")
    .select(
      "id, price_min, price_max, session_duration_min, is_online_available, is_in_person_available"
    )
    .eq("slug", therapistSlug)
    .eq("is_published", true)
    .maybeSingle();

  if (!therapist) return { ok: false, reason: "not_found" };

  // Defensa extra por si el request llega manipulado: nunca aceptar una
  // modalidad que el terapeuta no ofrece. La UI ya debería impedirlo, esto
  // es el respaldo del lado del servidor.
  let modality: Modality = requestedModality;
  if (modality === "online" && !therapist.is_online_available) {
    modality = "presencial";
  } else if (modality === "presencial" && !therapist.is_in_person_available) {
    modality = "online";
  }

  // Revalidar que el horario sigue libre (por si alguien más lo tomó justo antes)
  const { data: clash } = await supabase
    .from("appointments")
    .select("id")
    .eq("therapist_id", therapist.id)
    .eq("scheduled_at", scheduledAt)
    .neq("status", "cancelled")
    .maybeSingle();

  if (clash) return { ok: false, reason: "taken" };

  const price = therapist.price_min ?? therapist.price_max ?? 0;

  const { data: inserted } = await supabase
    .from("appointments")
    .insert({
      therapist_id: therapist.id,
      patient_id: userId,
      scheduled_at: scheduledAt,
      duration_min: therapist.session_duration_min ?? 50,
      modality,
      status: "pending_payment",
      payment_status: "pending",
      price,
    })
    .select("id")
    .single();

  if (inserted?.id) {
    // No debe bloquear la reserva si falla — se atrapa internamente.
    await notifyAppointmentRequested({
      appointmentId: inserted.id,
      therapistId: therapist.id,
      patientId: userId,
      scheduledAtIso: scheduledAt,
    });
  }

  return { ok: true };
}

// Cancela una cita en nombre de quien la pide, siempre y cuando esa persona
// sea de verdad uno de los dos participantes (terapeuta o paciente) — el
// filtro .eq(column, userId) hace que RLS y esta validación coincidan.
// No se puede cancelar algo que ya está cancelado o completado.
export type CancelledAppointmentInfo = {
  therapist_id: string;
  patient_id: string;
  scheduled_at: string;
};

export async function cancelAppointmentAsParticipant(
  supabase: SupabaseClient,
  userId: string,
  appointmentId: string,
  role: CancelRole,
  reason: string | null
): Promise<{ ok: boolean; appointment?: CancelledAppointmentInfo }> {
  const column = role === "patient" ? "patient_id" : "therapist_id";

  const { data: appointment } = await supabase
    .from("appointments")
    .select("id, status, therapist_id, patient_id, scheduled_at")
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

  if (error) return { ok: false };

  return {
    ok: true,
    appointment: {
      therapist_id: appointment.therapist_id as string,
      patient_id: appointment.patient_id as string,
      scheduled_at: appointment.scheduled_at as string,
    },
  };
}
