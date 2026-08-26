"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getAccessToken, createCalendarEvent, updateCalendarEvent } from "@/lib/google-calendar";
import { fallbackMeetingLink } from "@/lib/video-link";
import { cancelAppointmentAsParticipant } from "@/lib/appointments";
import {
  notifyAppointmentCancelled,
  notifyAppointmentConfirmed,
  notifyAppointmentRescheduled,
} from "@/lib/notifications/instant";

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
  if (!appointmentId) redirect("/dashboard?tab=citas&citas_error=1");

  const { data: appointment } = await supabase
    .from("appointments")
    .select("id, therapist_id, patient_id, scheduled_at, duration_min, status, payment_status, modality")
    .eq("id", appointmentId)
    .eq("therapist_id", user.id)
    .maybeSingle();

  if (!appointment) redirect("/dashboard?tab=citas&citas_error=1");
  if (appointment.status !== "pending_payment") {
    redirect("/dashboard?tab=citas&citas_error=1");
  }
  // No se puede confirmar una cita con pago por tarjeta pendiente — el
  // paciente pudo haber cerrado Stripe Checkout a medias. Las citas en
  // efectivo (terapeuta sin Stripe Connect activo, payment_status
  // "efectivo") nunca pasan por Checkout, así que se confirman igual.
  if (appointment.payment_status !== "paid" && appointment.payment_status !== "efectivo") {
    redirect("/dashboard?tab=citas&citas_error=1");
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
    redirect("/dashboard?tab=citas&citas_error=1");
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
      // El refresh token que teníamos guardado ya no sirve (expiró, se
      // revocó, etc.) — corregimos el flag para que el terapeuta vea el
      // aviso de "reconectar" en su perfil en vez de creer que sigue
      // conectado cuando en realidad ya no está pasando nada.
      await serviceClient
        .from("therapists")
        .update({ google_calendar_connected: false })
        .eq("id", user.id);
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

  revalidatePath("/dashboard");
  redirect("/dashboard?tab=citas&citas_confirmado=1");
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

  revalidatePath("/dashboard");
  redirect(result.ok ? "/dashboard?tab=citas&citas_cancelado=1" : "/dashboard?tab=citas&citas_error=1");
}

// Marca una cita ya confirmada y pasada como "no asistió" — el terapeuta la
// dispara a mano desde la ficha del paciente, con confirmación previa en el
// cliente (ver MarkNoShowForm). El .eq("status", "confirmed") en el update
// evita que se pueda re-marcar una cita cancelada o ya marcada por otra vía
// (ej. doble click, formulario reenviado). Este conteo alimenta el aviso de
// "paciente con inasistencias recurrentes" que ve el terapeuta al revisar
// solicitudes pendientes (ver noShowCounts en therapist-citas-tab.tsx).
export async function markNoShowTherapist(formData: FormData) {
  const { supabase, user } = await requireTherapist();
  const appointmentId = String(formData.get("appointment_id") || "");
  const patientId = String(formData.get("patient_id") || "");
  if (!appointmentId) return;

  await supabase
    .from("appointments")
    .update({ status: "no_show" })
    .eq("id", appointmentId)
    .eq("therapist_id", user.id)
    .eq("status", "confirmed");

  revalidatePath("/dashboard");
  if (patientId) revalidatePath(`/dashboard/pacientes/${patientId}`);
}

// Guarda las notas privadas del terapeuta sobre un paciente — no redirige
// (a diferencia de las demás acciones de esta página) para que el popup
// del paciente se quede abierto después de guardar, en vez de mandar a la
// persona hasta arriba de la página.
export async function savePatientNotes(formData: FormData) {
  const { supabase, user } = await requireTherapist();
  const patientId = String(formData.get("patient_id") || "");
  const notes = String(formData.get("notes") || "");
  if (!patientId) return;

  await supabase
    .from("therapist_patient_notes")
    .upsert(
      { therapist_id: user.id, patient_id: patientId, notes, updated_at: new Date().toISOString() },
      { onConflict: "therapist_id,patient_id" }
    );

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/pacientes/${patientId}`);
}

// Reagenda una cita propia a un nuevo horario. No hay pago por cita hoy
// (solo suscripción del terapeuta), así que no aplica ningún reembolso —
// simplemente se mueve la fecha y se avisa al paciente. Si la cita ya
// estaba confirmada con un evento real de Google Calendar, ese evento se
// mueve también (PATCH, no se recrea — se conserva el mismo Meet). Si nunca
// hubo evento de Google (cita aún no confirmada, o se confirmó con la sala
// de respaldo Jitsi), no hay nada que mover ahí: el link de Jitsi es fijo
// por cita, no depende de la fecha.
export async function rescheduleAppointment(formData: FormData) {
  const { supabase, user } = await requireTherapist();
  const appointmentId = String(formData.get("appointment_id") || "");
  const newLocalDatetime = String(formData.get("new_scheduled_at") || ""); // "YYYY-MM-DDTHH:mm", hora de Oaxaca

  if (!appointmentId || !newLocalDatetime) redirect("/dashboard?tab=citas&citas_error=1");

  const { data: appointment } = await supabase
    .from("appointments")
    .select(
      "id, therapist_id, patient_id, status, duration_min, google_calendar_event_id, modality, meeting_link, location_address"
    )
    .eq("id", appointmentId)
    .eq("therapist_id", user.id)
    .maybeSingle();

  if (!appointment || appointment.status === "cancelled" || appointment.status === "completed") {
    redirect("/dashboard?tab=citas&citas_error=1");
  }

  // Oaxaca no observa horario de verano — el offset -06:00 es constante.
  const newScheduledAtIso = new Date(`${newLocalDatetime}:00-06:00`).toISOString();
  if (Number.isNaN(new Date(newScheduledAtIso).getTime())) {
    redirect("/dashboard?tab=citas&citas_error=1");
  }

  const { error } = await supabase
    .from("appointments")
    .update({ scheduled_at: newScheduledAtIso })
    .eq("id", appointmentId)
    .eq("therapist_id", user.id);

  if (error) redirect("/dashboard?tab=citas&citas_error=1");

  const eventId = appointment.google_calendar_event_id as string | null;
  if (eventId) {
    const serviceClient = createServiceClient();
    try {
      const { data: refreshToken } = await serviceClient.rpc("get_google_refresh_token", {
        p_user_id: user.id,
      });
      if (refreshToken) {
        const accessToken = await getAccessToken(refreshToken);
        const newEndIso = new Date(
          new Date(newScheduledAtIso).getTime() + (appointment.duration_min as number) * 60 * 1000
        ).toISOString();
        await updateCalendarEvent({
          accessToken,
          eventId,
          startIso: newScheduledAtIso,
          endIso: newEndIso,
        });
      }
    } catch (err) {
      // No bloqueamos el reagendamiento por esto — la fecha ya quedó
      // actualizada en Lemy y el paciente ya recibirá el aviso con el nuevo
      // horario abajo. Si el refresh token ya no sirve, igual que en
      // confirmAppointment, apagamos el flag para que el terapeuta vea que
      // debe reconectar Google.
      console.error("Error moviendo el evento en Google Calendar al reagendar:", err);
      await serviceClient
        .from("therapists")
        .update({ google_calendar_connected: false })
        .eq("id", user.id);
    }
  }

  await notifyAppointmentRescheduled({
    appointmentId,
    therapistId: user.id,
    patientId: appointment.patient_id as string,
    newScheduledAtIso,
    durationMin: appointment.duration_min as number,
    modality: appointment.modality === "presencial" ? "presencial" : "online",
    meetingLink: appointment.meeting_link as string | null,
    address: appointment.location_address as string | null,
  });

  revalidatePath("/dashboard");
  redirect("/dashboard?tab=citas&citas_reagendado=1");
}
