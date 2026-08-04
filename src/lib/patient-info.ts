import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/service";

export type PatientInfo = {
  fullName: string | null;
  email: string | null;
  phone: string | null;
  lastAppointmentIso: string | null;
  notes: string | null;
};

// Arma un perfil básico de cada paciente para el terapeuta que lo atiende:
// contacto, última cita (con este terapeuta) y sus notas privadas. El
// correo no vive en `profiles` (solo en auth.users), así que se resuelve
// con el service client — la única forma de leerlo fuera del propio dueño
// de la cuenta.
export async function getPatientInfoMap(
  supabase: SupabaseClient,
  therapistId: string,
  patientIds: string[]
): Promise<Map<string, PatientInfo>> {
  const map = new Map<string, PatientInfo>();
  if (!patientIds.length) return map;

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, phone")
    .in("id", patientIds);

  const { data: notesRows } = await supabase
    .from("therapist_patient_notes")
    .select("patient_id, notes")
    .eq("therapist_id", therapistId)
    .in("patient_id", patientIds);

  const { data: appts } = await supabase
    .from("appointments")
    .select("patient_id, scheduled_at")
    .eq("therapist_id", therapistId)
    .in("patient_id", patientIds)
    .neq("status", "cancelled")
    .order("scheduled_at", { ascending: false });

  const lastApptByPatient = new Map<string, string>();
  for (const a of appts ?? []) {
    const pid = a.patient_id as string;
    if (!lastApptByPatient.has(pid)) lastApptByPatient.set(pid, a.scheduled_at as string);
  }

  const notesByPatient = new Map(
    (notesRows ?? []).map((n) => [n.patient_id as string, n.notes as string | null])
  );

  const serviceClient = createServiceClient();
  for (const id of patientIds) {
    const profile = (profiles ?? []).find((p) => p.id === id);
    const { data: authUser } = await serviceClient.auth.admin.getUserById(id);
    map.set(id, {
      fullName: (profile?.full_name as string | null) ?? null,
      email: authUser?.user?.email ?? null,
      phone: (profile?.phone as string | null) ?? null,
      lastAppointmentIso: lastApptByPatient.get(id) ?? null,
      notes: notesByPatient.get(id) ?? null,
    });
  }

  return map;
}
