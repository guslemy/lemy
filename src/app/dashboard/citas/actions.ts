"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getAccessToken, createCalendarEvent } from "@/lib/google-calendar";
import { fallbackMeetingLink } from "@/lib/video-link";
import { cancelAppointmentAsParticipant } from "@/lib/appointments";
import { notifyAppointmentCancelled, notifyAppointmentConfirmed } from "@/lib/notifications/instant";

async function requireTherapist() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "therapist") redirect("/dashboard");

  return { supabase, user };
}

// El terapeuta confirma una cita solicitada. Si tiene Google Calendar
// conectado, se crea el evento real con Meet autogenerado (mejor
// experiencia). Si no — o si Google falla por cualquier razón — la cita se
// confirma igual con una sala de respaldo (Jitsi, sin cuenta de nadie) más
// una invitación de calendario (.ics) por correo. Nadie se queda bloqueado
// por no tener Gmail.
export async function confirmAppointment(formData: FormData) {
  const { supabase, user } = await requireTherapist();
  const appointmentId = String(formData.get("appointment_id") || "");
  if (!appointmentId) redirect("/dashboard/citas?error=1");

  const { data: appointment } = await supabase
    .from("appointments")
    .select("id, therapist_id, patient_id, scheduled_at, duration_min, status, modality")
    .eq("id", appointmentId)
    .eq("therapist_id", user.id)
    .maybeSingle();

  if (!appointment) redirect("/dashboard/citas?error=1");
  if (appointment.status !== "pending_payment") {
    redirect("/dashboard/citas?error=1");
  }

  const modality: "online" | "presencial" = appointment.modality === "presencial" ? "presencial" : "online";

  const { data: therapist } = await supabase
    .from("therapists")
    .select("display_name, address")
    .eq("id", user.id)
    .maybeSingle();

  // Solo se lleva la dirección si la cita es presencial — para una cita en
  // línea no tiene sentido ni debe aparecer en ningún lado.
  const address = modality === "presencial" ? therapist?.address ?? null : null;

  const serviceClient = createServiceClient();

  const { data: refreshToken } = await serviceClient.rpc("get_google_refresh_token", {
    p_user_id: user.id,
  });

  const { data: patientAuth } = await serviceClient.auth.admin.getUserById(appointment.patient_id);
  const patientEmail = patientAuth?.user?.email;
  const therapistEmail = user.email;

  if (!patientEmail || !therapistEmail) {
    redirect("/dashboard/citas?error=1");
  }

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
    }
  }

  // La sala de respaldo (Jitsi) solo aplica a sesiones en línea — una cita
  // presencial nunca debe traer un link de videollamada, sea cual sea el
  // motivo por el que Google no se pudo usar.
  if (modality === "online" && !meetingLink) {
    meetingLink = fallbackMeetingLink(appointmentId);
  }

  await supabase
    .from("appointments")
    .update({
      status: "confirmed",
      google_calendar_event_id: eventId,
      meeting_link: meetingLink,
      location_address: address,
    })
    .eq("id", appointmentId)
    .eq("therapist_id", user.id);

  await notifyAppointmentConfirmed({
    appointmentId,
    therapistId: user.id,
    patientId: appointment.patient_id,
    scheduledAtIso: appointment.scheduled_at,
    durationMin: appointment.duration_min,
    modality,
    meetingLink,
    address,
  });

  revalidatePath("/dashboard/citas");
  revalidatePath("/dashboard");
  redirect("/dashboard/citas?confirmado=1");
}

// El terapeuta cancela una cita propia (pendiente o ya confirmada). No borra
// el evento de Calendar automáticamente todavía — eso queda para cuando
// conectemos las notificaciones, por ahora solo se refleja en Lemy.
export async function cancelAppointmentTherapist(formData: FormData) {
  const { supabase, user } = await requireTherapist();
  const appointmentId = String(formData.get("appointment_id") || "");
  const reason = String(formData.get("reason") || "").trim() || null;

  const result = await cancelAppointmentAsParticipant(
    supabase,
    user.id,
    appointmentId,
    "therapist",
    reason
  );

  if (result.ok && result.appointment) {
    await notifyAppointmentCancelled({
      appointmentId,
      cancelledBy: "therapist",
      therapistId: result.appointment.therapist_id,
      patientId: result.appointment.patient_id,
      scheduledAtIso: result.appointment.scheduled_at,
    });
  }

  revalidatePath("/dashboard/citas");
  revalidatePath("/dashboard");
  redirect(result.ok ? "/dashboard/citas?cancelado=1" : "/dashboard/citas?error=1");
}
