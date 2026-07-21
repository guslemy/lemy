// Notificaciones que se disparan al instante desde la acción misma (no
// desde el cron) — para que la persona se entere en el momento, no en la
// siguiente corrida de 15 minutos. Se llaman con el cliente de servicio
// porque quien dispara la acción (paciente o terapeuta) no necesariamente
// tiene permiso de RLS para leer el correo/teléfono de la otra persona.
//
// Importante: nunca deben tronar el flujo principal (reservar, cancelar) si
// falla el envío — por eso cada función atrapa sus propios errores.

import { createServiceClient } from "@/lib/supabase/service";
import { dispatch, emailOf, normalizePhone, phonesById } from "./engine";
import { buildIcsEvent } from "@/lib/ics";
import {
  appointmentRequestedTherapist,
  appointmentRequestedPatient,
  appointmentConfirmed,
  appointmentCancelledNotice,
} from "./emailTemplates";

const OAXACA_UTC_OFFSET_MIN = 6 * 60;
const WEEKDAY_LABELS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

function whenLabelFor(iso: string) {
  const local = new Date(new Date(iso).getTime() - OAXACA_UTC_OFFSET_MIN * 60 * 1000);
  const weekday = WEEKDAY_LABELS[local.getUTCDay()];
  const d = local.getUTCDate();
  const m = local.getUTCMonth() + 1;
  const hh = String(local.getUTCHours()).padStart(2, "0");
  const mm = String(local.getUTCMinutes()).padStart(2, "0");
  return `${weekday} ${d}/${m} · ${hh}:${mm}`;
}

// Al momento en que el paciente solicita la cita: el terapeuta se entera de
// inmediato de que tiene algo pendiente de confirmar, y el paciente recibe
// un recibo de que su solicitud quedó registrada.
export async function notifyAppointmentRequested({
  appointmentId,
  therapistId,
  patientId,
  scheduledAtIso,
}: {
  appointmentId: string;
  therapistId: string;
  patientId: string;
  scheduledAtIso: string;
}) {
  try {
    const supabase = createServiceClient();
    const whenLabel = whenLabelFor(scheduledAtIso);

    const [{ data: therapistRow }, { data: patientProfile }, phones, therapistEmail, patientEmail] =
      await Promise.all([
        supabase.from("therapists").select("display_name").eq("id", therapistId).maybeSingle(),
        supabase.from("profiles").select("full_name").eq("id", patientId).maybeSingle(),
        phonesById(supabase, [therapistId, patientId]),
        emailOf(supabase, therapistId),
        emailOf(supabase, patientId),
      ]);

    const therapistName = (therapistRow?.display_name as string | undefined) ?? "tu terapeuta";
    const patientName = (patientProfile?.full_name as string | undefined) ?? "un paciente";

    const forTherapist = appointmentRequestedTherapist({ therapistName, patientName, whenLabel });
    await dispatch({
      supabase,
      type: "appointment_requested_therapist",
      relatedId: appointmentId,
      recipientId: therapistId,
      email: therapistEmail,
      phone: normalizePhone(phones.get(therapistId)),
      subject: forTherapist.subject,
      html: forTherapist.html,
      whatsappTemplate: "lemy_appointment_requested_therapist",
      whatsappParams: [therapistName, patientName, whenLabel],
    });

    const forPatient = appointmentRequestedPatient({ patientName, therapistName, whenLabel });
    await dispatch({
      supabase,
      type: "appointment_requested_patient",
      relatedId: appointmentId,
      recipientId: patientId,
      email: patientEmail,
      phone: normalizePhone(phones.get(patientId)),
      subject: forPatient.subject,
      html: forPatient.html,
      whatsappTemplate: "lemy_appointment_requested_patient",
      whatsappParams: [patientName, therapistName, whenLabel],
    });
  } catch (err) {
    console.error("Error notificando nueva solicitud de cita:", err);
  }
}

// Al momento en que el terapeuta confirma la cita. Si es en línea, ambas
// partes reciben el link real de la sesión (Google Meet, o la sala de
// respaldo de Jitsi si no hay Google conectado). Si es presencial, reciben
// la dirección del consultorio en vez de un link — nunca los dos a la vez.
// Siempre va una invitación de calendario (.ics) adjunta, funciona igual sin
// importar el proveedor de correo de quien la reciba.
export async function notifyAppointmentConfirmed({
  appointmentId,
  therapistId,
  patientId,
  scheduledAtIso,
  durationMin,
  modality,
  meetingLink,
  address,
}: {
  appointmentId: string;
  therapistId: string;
  patientId: string;
  scheduledAtIso: string;
  durationMin: number;
  modality: "online" | "presencial";
  meetingLink: string | null;
  address: string | null;
}) {
  try {
    const supabase = createServiceClient();
    const whenLabel = whenLabelFor(scheduledAtIso);
    const endIso = new Date(new Date(scheduledAtIso).getTime() + durationMin * 60 * 1000).toISOString();

    const [{ data: therapistRow }, { data: patientProfile }, phones, therapistEmail, patientEmail] =
      await Promise.all([
        supabase.from("therapists").select("display_name").eq("id", therapistId).maybeSingle(),
        supabase.from("profiles").select("full_name").eq("id", patientId).maybeSingle(),
        phonesById(supabase, [therapistId, patientId]),
        emailOf(supabase, therapistId),
        emailOf(supabase, patientId),
      ]);

    const therapistName = (therapistRow?.display_name as string | undefined) ?? "tu terapeuta";
    const patientName = (patientProfile?.full_name as string | undefined) ?? "tu paciente";

    if (!therapistEmail || !patientEmail) return;

    const modalityLabel = modality === "online" ? "en línea" : "presencial";
    const icsContent = buildIcsEvent({
      uid: appointmentId,
      summary: `Sesión Lemy (${modalityLabel}) — ${therapistName} y ${patientName}`,
      description:
        modality === "online"
          ? `Sesión en línea agendada a través de Lemy.${meetingLink ? ` Link: ${meetingLink}` : ""}`
          : "Sesión presencial agendada a través de Lemy.",
      location: modality === "presencial" ? address : null,
      startIso: scheduledAtIso,
      endIso,
      organizerEmail: therapistEmail,
      organizerName: therapistName,
      attendeeEmail: patientEmail,
      attendeeName: patientName,
    });
    const attachments = [
      { filename: "cita-lemy.ics", content: Buffer.from(icsContent, "utf-8").toString("base64") },
    ];

    const forTherapist = appointmentConfirmed({
      recipientName: therapistName,
      otherPartyName: patientName,
      whenLabel,
      modality,
      meetingLink,
      address,
    });
    await dispatch({
      supabase,
      type: "appointment_confirmed_therapist",
      relatedId: appointmentId,
      recipientId: therapistId,
      email: therapistEmail,
      phone: normalizePhone(phones.get(therapistId)),
      subject: forTherapist.subject,
      html: forTherapist.html,
      attachments,
      whatsappTemplate: "lemy_appointment_confirmed",
      whatsappParams: [therapistName, patientName, whenLabel],
    });

    const forPatient = appointmentConfirmed({
      recipientName: patientName,
      otherPartyName: therapistName,
      whenLabel,
      modality,
      meetingLink,
      address,
    });
    await dispatch({
      supabase,
      type: "appointment_confirmed_patient",
      relatedId: appointmentId,
      recipientId: patientId,
      email: patientEmail,
      phone: normalizePhone(phones.get(patientId)),
      subject: forPatient.subject,
      html: forPatient.html,
      attachments,
      whatsappTemplate: "lemy_appointment_confirmed",
      whatsappParams: [patientName, therapistName, whenLabel],
    });
  } catch (err) {
    console.error("Error notificando confirmación de cita:", err);
  }
}

// Al cancelar (cualquiera de los dos), la otra parte se entera de inmediato
// — clave para el caso de que un horario choque con un bloqueo recién
// hecho: quien lo bloqueó no debería enterarse hasta el próximo recordatorio.
export async function notifyAppointmentCancelled({
  appointmentId,
  cancelledBy,
  therapistId,
  patientId,
  scheduledAtIso,
}: {
  appointmentId: string;
  cancelledBy: "patient" | "therapist";
  therapistId: string;
  patientId: string;
  scheduledAtIso: string;
}) {
  try {
    const supabase = createServiceClient();
    const whenLabel = whenLabelFor(scheduledAtIso);
    const recipientId = cancelledBy === "therapist" ? patientId : therapistId;

    const [{ data: therapistRow }, { data: patientProfile }, phones, recipientEmail] = await Promise.all([
      supabase.from("therapists").select("display_name").eq("id", therapistId).maybeSingle(),
      supabase.from("profiles").select("full_name").eq("id", patientId).maybeSingle(),
      phonesById(supabase, [recipientId]),
      emailOf(supabase, recipientId),
    ]);

    const therapistName = (therapistRow?.display_name as string | undefined) ?? "tu terapeuta";
    const patientName = (patientProfile?.full_name as string | undefined) ?? "el paciente";

    const recipientName = cancelledBy === "therapist" ? patientName : therapistName;
    const otherPartyName = cancelledBy === "therapist" ? therapistName : patientName;
    const cancelledByLabel = cancelledBy === "therapist" ? therapistName : patientName;

    const { subject, html } = appointmentCancelledNotice({
      recipientName,
      otherPartyName,
      whenLabel,
      cancelledByLabel,
    });

    await dispatch({
      supabase,
      type: "appointment_cancelled",
      relatedId: appointmentId,
      recipientId,
      email: recipientEmail,
      phone: normalizePhone(phones.get(recipientId)),
      subject,
      html,
      whatsappTemplate: "lemy_appointment_cancelled",
      whatsappParams: [recipientName, otherPartyName, whenLabel],
    });
  } catch (err) {
    console.error("Error notificando cancelación de cita:", err);
  }
}
