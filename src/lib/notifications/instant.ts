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
import {
  appointmentRequestedTherapist,
  appointmentRequestedPatient,
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
