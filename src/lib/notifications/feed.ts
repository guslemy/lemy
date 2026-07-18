import type { SupabaseClient } from "@supabase/supabase-js";

// Traduce notification_log (pensado originalmente solo para deduplicar
// envíos del cron) en una bandeja de entrada legible dentro del dashboard.
// Un mismo evento puede haber generado dos filas (una por correo, otra por
// WhatsApp) — aquí se agrupan en una sola tarjeta por evento.

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

export type NotificationItem = {
  id: string;
  type: string;
  sentAt: string;
  readAt: string | null;
  label: string;
};

type RawLogRow = {
  id: string;
  notification_type: string;
  related_id: string;
  sent_at: string;
  read_at: string | null;
};

type AppointmentInfo = { id: string; scheduled_at: string; patient_id: string; therapist_id: string };

export async function getNotificationFeed(
  supabase: SupabaseClient,
  userId: string,
  limit = 30
): Promise<NotificationItem[]> {
  const { data: rawRows } = await supabase
    .from("notification_log")
    .select("id, notification_type, related_id, sent_at, read_at")
    .eq("recipient_id", userId)
    .order("sent_at", { ascending: false })
    .limit(200);

  const rows = (rawRows ?? []) as RawLogRow[];

  // Un mismo evento (mismo tipo + mismo related_id) pudo mandarse por dos
  // canales — nos quedamos con la primera fila que veamos de cada grupo.
  const seen = new Map<string, RawLogRow>();
  for (const r of rows) {
    const key = `${r.notification_type}:${r.related_id}`;
    if (!seen.has(key)) seen.set(key, r);
  }
  const deduped = Array.from(seen.values()).slice(0, limit);

  const appointmentIds = Array.from(
    new Set(deduped.filter((r) => r.notification_type.startsWith("appointment_")).map((r) => r.related_id))
  );

  const { data: rawAppointments } = appointmentIds.length
    ? await supabase.from("appointments").select("id, scheduled_at, patient_id, therapist_id").in("id", appointmentIds)
    : { data: [] };
  const appointmentById = new Map(((rawAppointments ?? []) as AppointmentInfo[]).map((a) => [a.id, a]));

  const patientIds = Array.from(new Set(Array.from(appointmentById.values()).map((a) => a.patient_id)));
  const therapistIds = Array.from(new Set(Array.from(appointmentById.values()).map((a) => a.therapist_id)));

  const { data: rawPatients } = patientIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", patientIds)
    : { data: [] };
  const { data: rawTherapists } = therapistIds.length
    ? await supabase.from("therapists").select("id, display_name").in("id", therapistIds)
    : { data: [] };

  const patientNameById = new Map((rawPatients ?? []).map((p) => [p.id as string, p.full_name as string | null]));
  const therapistNameById = new Map((rawTherapists ?? []).map((t) => [t.id as string, t.display_name as string]));

  function labelFor(r: RawLogRow): string {
    const appt = appointmentById.get(r.related_id);
    const patientName = appt ? patientNameById.get(appt.patient_id) ?? "un paciente" : "un paciente";
    const therapistName = appt ? therapistNameById.get(appt.therapist_id) ?? "tu terapeuta" : "tu terapeuta";
    const when = appt ? whenLabelFor(appt.scheduled_at) : "";

    switch (r.notification_type) {
      case "trial_5d":
        return "Tu prueba gratis termina en 5 días.";
      case "trial_1d":
        return "Tu prueba gratis termina mañana.";
      case "renewal_3d":
        return "Tu suscripción se renueva en 3 días.";
      case "renewal_1d":
        return "Tu suscripción se renueva mañana.";
      case "appointment_1d":
        return `Recordatorio: tienes una sesión mañana${when ? ` (${when})` : ""}.`;
      case "appointment_1h":
        return `Recordatorio: tu sesión es en 1 hora${when ? ` (${when})` : ""}.`;
      case "appointment_requested_therapist":
        return `Nueva solicitud de cita con ${patientName}${when ? ` para el ${when}` : ""}.`;
      case "appointment_requested_patient":
        return `Recibimos tu solicitud con ${therapistName}${when ? ` para el ${when}` : ""}.`;
      case "appointment_cancelled":
        return `Se canceló una cita${when ? ` del ${when}` : ""}.`;
      default:
        return "Tienes una notificación nueva.";
    }
  }

  return deduped.map((r) => ({
    id: r.id,
    type: r.notification_type,
    sentAt: r.sent_at,
    readAt: r.read_at,
    label: labelFor(r),
  }));
}

export async function countUnread(supabase: SupabaseClient, userId: string): Promise<number> {
  const { count } = await supabase
    .from("notification_log")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", userId)
    .is("read_at", null);
  return count ?? 0;
}

export async function markAllRead(supabase: SupabaseClient, userId: string) {
  await supabase
    .from("notification_log")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", userId)
    .is("read_at", null);
}
