import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/service";

export type PatientInfo = {
  fullName: string | null;
  email: string | null;
  phone: string | null;
  lastAppointmentIso: string | null;
  notes: string | null;
  // La cuenta del paciente fue cerrada: el nombre se muestra como "Nombre (eliminado)".
  accountClosed: boolean;
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

  // (2026-11-22) Por tandas de 100: con cientos de pacientes, un solo .in()
  // con todos los ids haría una URL demasiado larga.
  const profiles: { id: unknown; full_name: unknown; phone: unknown; account_closed_at?: unknown }[] = [];
  const notesRows: { patient_id: unknown; notes: unknown }[] = [];
  const appts: { patient_id: unknown; scheduled_at: unknown }[] = [];
  for (let i = 0; i < patientIds.length; i += 100) {
    const ids = patientIds.slice(i, i + 100);
    const [p, n, a] = await Promise.all([
      serviceClient.from("profiles").select("id, full_name, phone, account_closed_at").in("id", ids),
      supabase.from("therapist_patient_notes").select("patient_id, notes").eq("therapist_id", therapistId).in("patient_id", ids),
      supabase
        .from("appointments")
        .select("patient_id, scheduled_at")
        .eq("therapist_id", therapistId)
        .in("patient_id", ids)
        .neq("status", "cancelled")
        .order("scheduled_at", { ascending: false })
        .limit(2000),
    ]);
    profiles.push(...(p.data ?? []));
    notesRows.push(...(n.data ?? []));
    appts.push(...(a.data ?? []));
  }

  // Cuentas cerradas: la cuenta de Lemy quedó anonimizada, pero el terapeuta
  // conserva su propia copia de nombre/correo/teléfono en su expediente
  // (patient_clinical_profile), que se usa para identificarlos.
  const closedIds = profiles.filter((p) => p.account_closed_at).map((p) => p.id as string);
  const closedContact = new Map<string, { full_name: string | null; phone: string | null; email: string | null }>();
  for (let i = 0; i < closedIds.length; i += 100) {
    const { data } = await supabase
      .from("patient_clinical_profile")
      .select("patient_id, full_name, phone, email")
      .eq("therapist_id", therapistId)
      .in("patient_id", closedIds.slice(i, i + 100));
    for (const r of data ?? []) {
      closedContact.set(r.patient_id as string, {
        full_name: r.full_name as string | null,
        phone: r.phone as string | null,
        email: r.email as string | null,
      });
    }
  }

  // Las citas de cada tanda vienen de la más reciente a la más antigua; se
  // conserva la fecha mayor por paciente.
  const lastApptByPatient = new Map<string, string>();
  for (const a of appts) {
    const pid = a.patient_id as string;
    const when = a.scheduled_at as string;
    const prev = lastApptByPatient.get(pid);
    if (!prev || when > prev) lastApptByPatient.set(pid, when);
  }

  const notesByPatient = new Map(notesRows.map((n) => [n.patient_id as string, n.notes as string | null]));

  // (2026-11-22) En paralelo y por tandas: con cientos de pacientes importados,
  // una consulta de correo por paciente una tras otra tardaba demasiado.
  const authById = new Map<string, string | null>();
  for (let i = 0; i < patientIds.length; i += 25) {
    const chunk = patientIds.slice(i, i + 25);
    const users = await Promise.all(chunk.map((id) => serviceClient.auth.admin.getUserById(id)));
    chunk.forEach((id, idx) => authById.set(id, users[idx].data?.user?.email ?? null));
  }

  for (const id of patientIds) {
    const profile = profiles.find((p) => p.id === id);
    const authUser = { user: { email: authById.get(id) ?? undefined } };
    const kept = closedContact.get(id);
    map.set(id, {
      fullName: kept?.full_name?.trim() || ((profile?.full_name as string | null) ?? null),
      // Los importados sin correo llevan uno interno de relleno: no se muestra.
      email: kept?.email?.trim()
        ? kept.email
        : authUser?.user?.email?.endsWith("@importados.lemy.mx")
          ? null
          : (authUser?.user?.email ?? null),
      phone: kept?.phone?.trim() ? kept.phone : ((profile?.phone as string | null) ?? null),
      lastAppointmentIso: lastApptByPatient.get(id) ?? null,
      notes: notesByPatient.get(id) ?? null,
      accountClosed: Boolean(profile?.account_closed_at),
    });
  }

  return map;
}
