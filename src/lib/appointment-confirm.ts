import { createServiceClient } from "@/lib/supabase/service";
import { getAccessToken, createCalendarEvent } from "@/lib/google-calendar";
import { fallbackMeetingLink } from "@/lib/video-link";
import { notifyAppointmentConfirmed } from "@/lib/notifications/instant";

// Lógica de "confirmar la cita y crear el evento real" — antes vivía solo
// dentro de confirmAppointment (dashboard/citas/actions.ts), disparada a
// mano por el terapeuta para CUALQUIER cita pendiente. A petición de
// Gustavo (2026-09-21): un pago con tarjeta YA ES la confirmación — pedirle
// al terapeuta un clic aparte para algo que el paciente ya pagó le quita
// eficiencia al proceso sin ninguna razón real (mismo principio que ya
// aplicamos antes con la disponibilidad de Google Calendar: cero fricción
// humana donde el sistema ya tiene toda la información para decidir solo).
//
// Por eso esto se separó a un módulo aparte, sin "use server" ni
// requireTherapist(): lo llaman dos caminos distintos —
// confirmAppointment (clic manual del terapeuta, solo para citas en
// efectivo) y el webhook de Stripe Connect (checkout.session.completed,
// automático en cuanto se cobra con tarjeta) — y el webhook no tiene ningún
// usuario autenticado de por medio, así que esto corre siempre con el
// cliente de servicio.
export async function confirmAppointmentAndCreateEvent(appointmentId: string): Promise<boolean> {
  const supabase = createServiceClient();

  const { data: appointment } = await supabase
    .from("appointments")
    .select("id, therapist_id, patient_id, scheduled_at, duration_min, status, modality")
    .eq("id", appointmentId)
    .maybeSingle();

  if (!appointment || appointment.status !== "pending_payment") return false;

  const modality: "online" | "presencial" = appointment.modality === "presencial" ? "presencial" : "online";

  const { data: therapist } = await supabase
    .from("therapists")
    .select("display_name, address")
    .eq("id", appointment.therapist_id)
    .maybeSingle();

  // Solo se lleva la dirección si la cita es presencial.
  const address = modality === "presencial" ? therapist?.address ?? null : null;

  const { data: refreshToken } = await supabase.rpc("get_google_refresh_token", {
    p_user_id: appointment.therapist_id,
  });

  const { data: therapistAuth } = await supabase.auth.admin.getUserById(appointment.therapist_id);
  const { data: patientAuth } = await supabase.auth.admin.getUserById(appointment.patient_id);
  const therapistEmail = therapistAuth?.user?.email;
  const patientEmail = patientAuth?.user?.email;

  if (!therapistEmail || !patientEmail) return false;

  const { data: patientProfile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", appointment.patient_id)
    .maybeSingle();

  const startIso = new Date(appointment.scheduled_at).toISOString();
  const endIso = new Date(
    new Date(appointment.scheduled_at).getTime() + appointment.duration_min * 60 * 1000
  ).toISOString();

  const therapistName = therapist?.display_name ?? "tu terapeuta";
  const patientName = patientProfile?.full_name ?? "tu paciente";

  let eventId: string | null = null;
  let meetingLink: string | null = null;
  const modalityLabel = modality === "online" ? "en línea" : "presencial";

  if (refreshToken) {
    try {
      const accessToken = await getAccessToken(refreshToken);
      const created = await createCalendarEvent({
        accessToken,
        summary: `Sesión Lemy (${modalityLabel}) — ${therapistName} y ${patientName}`,
        description:
          modality === "online"
            ? "Sesión en línea agendada a través de Lemy."
            : "Sesión presencial agendada a través de Lemy.",
        startIso,
        endIso,
        therapistEmail,
        patientEmail,
        modality,
        location: modality === "presencial" ? address : null,
      });
      eventId = created.eventId;
      meetingLink = created.meetingLink;
    } catch (err) {
      console.error("Error creando evento en Google Calendar, se usa la sala de respaldo:", err);
      await supabase.from("therapists").update({ google_calendar_connected: false }).eq("id", appointment.therapist_id);
    }
  }

  // La sala de respaldo (Jitsi) solo aplica a sesiones en línea.
  if (modality === "online" && !meetingLink) {
    meetingLink = fallbackMeetingLink(appointmentId);
  }

  const { error } = await supabase
    .from("appointments")
    .update({
      status: "confirmed",
      google_calendar_event_id: eventId,
      meeting_link: meetingLink,
      location_address: address,
      therapist_confirmation_expires_at: null,
    })
    .eq("id", appointmentId)
    .eq("status", "pending_payment");

  if (error) return false;

  await notifyAppointmentConfirmed({
    appointmentId,
    therapistId: appointment.therapist_id,
    patientId: appointment.patient_id,
    scheduledAtIso: appointment.scheduled_at,
    durationMin: appointment.duration_min,
    modality,
    meetingLink,
    address,
  });

  return true;
}
