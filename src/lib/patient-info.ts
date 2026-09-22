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
// contacto, última cita (con este terapeuta) y sus notas privadas. Todo se
// resuelve con el service client: el correo porque no vive en `profiles`
// (solo en auth.users), y el nombre/teléfono porque la RLS de `profiles`
// solo deja a cada quien leer su propia fila (ver comentario abajo).
export async function getPatientInfoMap(
  supabase: SupabaseClient,
  therapistId: string,
  patientIds: string[]
): Promise<Map<string, PatientInfo>> {
  const map = new Map<string, PatientInfo>();
  if (!patientIds.length) return map;

  // `profiles` tiene RLS "cada quien ve solo su propia fila" (auth.uid() =
  // id) — con el cliente normal del terapeuta esta consulta siempre
  // regresaba 0 filas para sus pacientes (nunca es su propio id), y
  // full_name caía en null para todos, mostrando "Paciente" en toda la UI
  // del terapeuta aunque el dato sí existiera. Se usa el service client
  // (como ya se hacía para el correo) porque para acá abajo la lista de
  // `patientIds` ya viene acotada a pacientes con una cita real con este
  // terapeuta — no es una fuga de datos, es leer lo que igual le
  // corresponde ver.
  const serviceClient = createServiceClient();
  const { data: profiles } = await serviceClient
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
