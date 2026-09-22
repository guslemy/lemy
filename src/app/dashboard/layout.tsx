import { createClient } from "@/lib/supabase/server";
import { getPatientInfoMap } from "@/lib/patient-info";
import { AttendanceGate } from "@/components/attendance-gate";
import { markSessionCompleted, cancelAppointmentTherapist, rescheduleAppointment } from "./citas/actions";

// Envuelve TODO /dashboard/* (perfil, disponibilidad, pacientes, la ficha de
// un paciente, etc.) — a petición de Gustavo (2026-09-21): el pop-up de
// confirmar asistencia debe bloquear cualquier pantalla del panel del
// terapeuta, no solo la pestaña de Consultas. Antes no existía ningún
// layout para esta sección; cada página armaba su propio <SiteHeader>/
// <SiteFooter> por separado, así que este layout no les quita ni les repite
// nada — solo agrega, como overlay, lo que haga falta encima.
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let gateItem: Awaited<ReturnType<typeof buildGateItem>> = null;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role === "therapist") {
      gateItem = await buildGateItem(supabase, user.id);
    }
  }

  return (
    <>
      {gateItem && (
        <AttendanceGate
          item={gateItem}
          markCompletedAction={markSessionCompleted}
          rescheduleAction={rescheduleAppointment}
          cancelAction={cancelAppointmentTherapist}
        />
      )}
      {children}
    </>
  );
}

// Una cita confirmada cuenta como "por resolver" cuando ya pasó su hora +
// 1 hora de colchón (a propósito, no justo al terminar — le da tiempo al
// terapeuta de cerrar la sesión con calma antes de que el pop-up le
// aparezca). Se manda solo la más antigua sin resolver; totalPending le
// dice al pop-up si hay más detrás en la fila (ver attendance-gate.tsx).
async function buildGateItem(supabase: Awaited<ReturnType<typeof createClient>>, therapistId: string) {
  const cutoffIso = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { data: pending, count } = await supabase
    .from("appointments")
    .select("id, patient_id, scheduled_at", { count: "exact" })
    .eq("therapist_id", therapistId)
    .eq("status", "confirmed")
    .lte("scheduled_at", cutoffIso)
    .order("scheduled_at", { ascending: true })
    .limit(1);

  const next = pending?.[0];
  if (!next) return null;

  const infoMap = await getPatientInfoMap(supabase, therapistId, [next.patient_id as string]);
  const patientName = infoMap.get(next.patient_id as string)?.fullName ?? "tu paciente";

  return {
    id: next.id as string,
    patientName,
    scheduledAtIso: next.scheduled_at as string,
    totalPending: count ?? 1,
  };
}
