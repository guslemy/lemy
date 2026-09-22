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
  notifyAppointmentProposed,
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

// Marca una cita confirmada y ya pasada como "sí se llevó a cabo" — una de
// las 3 opciones del pop-up de confirmar asistencia (AttendanceGate, ver
// src/app/dashboard/layout.tsx y src/components/attendance-gate.tsx), a
// petición de Gustavo (2026-09-21) para tener estadísticas mensuales
// confiables. El .eq("status", "confirmed") evita re-marcar algo ya
// resuelto por otra vía (doble clic, formulario reenviado).
export async function markSessionCompleted(formData: FormData) {
  const { supabase, user } = await requireTherapist();
  const appointmentId = String(formData.get("appointment_id") || "");
  if (!appointmentId) redirect("/dashboard?tab=citas&citas_error=1");

  await supabase
    .from("appointments")
    .update({ status: "completed" })
    .eq("id", appointmentId)
    .eq("therapist_id", user.id)
    .eq("status", "confirmed");

  revalidatePath("/dashboard");
  redirect("/dashboard?tab=citas&citas_completada=1");
}

// El terapeuta agenda directo una cita con un paciente suyo desde su ficha
// (botón "Agendar consulta con este paciente", a petición de Gustavo
// 2026-09-21). A diferencia de una solicitud normal (paciente → terapeuta),
// aquí el sentido es al revés: la cita nace en "pending_patient_acceptance"
// con 24 horas para que el paciente la acepte (y pague, si aplica con
// tarjeta) o la rechace — ver acceptTherapistAppointment/
// declineTherapistAppointment en dashboard/mis-citas/actions.ts. El horario
// queda apartado desde el instante en que se crea: todas las consultas de
// "¿está libre este horario?" en el sitio (getAvailableSlots,
// requestAppointmentForUser, esta misma función) ya excluyen cualquier cita
// con status != "cancelled", así que un status nuevo como este no necesita
// ningún cambio adicional en ese código para bloquear el espacio.
export async function createAppointmentForPatient(formData: FormData) {
  const { supabase, user } = await requireTherapist();
  const patientId = String(formData.get("patient_id") || "");
  const scheduledAt = String(formData.get("scheduled_at") || "");
  const modality: "online" | "presencial" = formData.get("modality") === "presencial" ? "presencial" : "online";
  const therapistServiceId = String(formData.get("therapist_service_id") || "") || null;

  if (!patientId || !scheduledAt) redirect(`/dashboard/pacientes/${patientId}?agendar_error=1`);

  // Cliente de servicio para las dos operaciones que la RLS de por sí no
  // deja hacer al cliente normal del terapeuta: leer el perfil de OTRO
  // usuario (profiles_select_own exige auth.uid() = id — mismo bug que ya
  // arreglamos en getPatientInfoMap, ver lib/patient-info.ts) e insertar una
  // cita cuyo patient_id no es el propio (appointments_patient_insert exige
  // auth.uid() = patient_id; no existe una policy equivalente para que el
  // terapeuta inserte a nombre de su paciente).
  const serviceClient = createServiceClient();

  // Defensa del lado del servidor: patientId llega en un campo oculto del
  // formulario, así que nunca hay que confiar en que de verdad corresponde
  // a un paciente real antes de insertar la cita.
  const { data: patientProfile } = await serviceClient
    .from("profiles")
    .select("role")
    .eq("id", patientId)
    .maybeSingle();
  if (patientProfile?.role !== "patient") {
    redirect(`/dashboard/pacientes/${patientId}?agendar_error=1`);
  }

  // Mismo requisito que la ficha del paciente (ver page.tsx: notFound() si
  // no hay ninguna cita previa entre ambos) — sin esto, alguien podría
  // llamar a esta acción a mano con el id de un paciente con el que este
  // terapeuta nunca ha tenido contacto.
  const { count: priorCount } = await supabase
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("therapist_id", user.id)
    .eq("patient_id", patientId);
  if (!priorCount) redirect(`/dashboard/pacientes/${patientId}?agendar_error=1`);

  let servicePrice: number | null = null;
  let serviceDurationMin: number | null = null;
  if (therapistServiceId) {
    const { data: service } = await supabase
      .from("therapist_services")
      .select("price, duration_min")
      .eq("id", therapistServiceId)
      .eq("therapist_id", user.id)
      .maybeSingle();
    if (service) {
      servicePrice = service.price as number;
      serviceDurationMin = service.duration_min as number;
    }
  }

  const { data: therapistRow } = await supabase
    .from("therapists")
    .select("session_duration_min, price_min, price_max")
    .eq("id", user.id)
    .maybeSingle();

  const durationMin = serviceDurationMin ?? (therapistRow?.session_duration_min as number | undefined) ?? 50;
  const price = servicePrice ?? (therapistRow?.price_min as number | undefined) ?? (therapistRow?.price_max as number | undefined) ?? 0;

  // Mismo criterio de traslape real que requestAppointmentForUser (ver
  // src/lib/appointments.ts) — el terapeuta también puede chocar consigo
  // mismo si elige un horario que ya tiene ocupado.
  const newStartMs = new Date(scheduledAt).getTime();
  if (Number.isNaN(newStartMs)) redirect(`/dashboard/pacientes/${patientId}?agendar_error=1`);
  const newEndMs = newStartMs + durationMin * 60 * 1000;
  const dayMs = 24 * 60 * 60 * 1000;

  const { data: nearby } = await supabase
    .from("appointments")
    .select("scheduled_at, duration_min")
    .eq("therapist_id", user.id)
    .neq("status", "cancelled")
    .gte("scheduled_at", new Date(newStartMs - dayMs).toISOString())
    .lte("scheduled_at", new Date(newStartMs + dayMs).toISOString());

  const clash = (nearby ?? []).some((a) => {
    const aStartMs = new Date(a.scheduled_at as string).getTime();
    const aEndMs = aStartMs + ((a.duration_min as number | null) ?? 50) * 60 * 1000;
    return newStartMs < aEndMs && newEndMs > aStartMs;
  });
  if (clash) redirect(`/dashboard/pacientes/${patientId}?agendar_error=ocupado`);

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const { data: inserted, error } = await serviceClient
    .from("appointments")
    .insert({
      therapist_id: user.id,
      patient_id: patientId,
      scheduled_at: scheduledAt,
      duration_min: durationMin,
      modality,
      status: "pending_patient_acceptance",
      payment_status: "pending",
      price,
      therapist_service_id: servicePrice !== null ? therapistServiceId : null,
      patient_acceptance_expires_at: expiresAt,
    })
    .select("id")
    .single();

  if (error || !inserted?.id) redirect(`/dashboard/pacientes/${patientId}?agendar_error=1`);

  await notifyAppointmentProposed({
    appointmentId: inserted.id,
    therapistId: user.id,
    patientId,
    scheduledAtIso: scheduledAt,
  });

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/pacientes/${patientId}`);
  redirect(`/dashboard/pacientes/${patientId}?agendar_ok=1`);
}

// Guarda las notas privadas del terapeuta sobre un paciente — no redirige
// (a diferencia de las demás acciones de esta página) para que el popup
// del paciente se quede abierto después de guardar, en vez de mandar a la
// persona hasta arriba de la página.
//
// Firma de useActionState (prevState, formData) en vez de solo (formData):
// antes esta acción no regresaba nada, así que aunque el guardado sí
// funcionaba, no había ninguna forma de que la UI supiera que ya terminó —
// se sentía "como que no hace nada". Con el { ok } de regreso, SaveNotesForm
// (citas-client.tsx) puede mostrar "Tu nota se ha actualizado" justo cuando
// el guardado se confirma.
export type SaveNotesState = { ok: boolean };

export async function savePatientNotes(
  _prevState: SaveNotesState,
  formData: FormData
): Promise<SaveNotesState> {
  const { supabase, user } = await requireTherapist();
  const patientId = String(formData.get("patient_id") || "");
  const notes = String(formData.get("notes") || "");
  if (!patientId) return { ok: false };

  const { error } = await supabase
    .from("therapist_patient_notes")
    .upsert(
      { therapist_id: user.id, patient_id: patientId, notes, updated_at: new Date().toISOString() },
      { onConflict: "therapist_id,patient_id" }
    );

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/pacientes/${patientId}`);
  return { ok: !error };
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
