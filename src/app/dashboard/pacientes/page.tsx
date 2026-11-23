import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getPatientInfoMap } from "@/lib/patient-info";
import { createServiceClient } from "@/lib/supabase/service";
import { isMinorRow } from "@/lib/patient-import/normalize";
import { PatientsList, type InviteCandidate, type PatientListItem } from "./pacientes-list";

const WEEKDAY_LABELS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const OAXACA_UTC_OFFSET_MIN = 6 * 60;

function formatOaxaca(iso: string) {
  const utcMs = new Date(iso).getTime() - OAXACA_UTC_OFFSET_MIN * 60 * 1000;
  const local = new Date(utcMs);
  const weekday = WEEKDAY_LABELS[local.getUTCDay()];
  const d = local.getUTCDate();
  const m = local.getUTCMonth() + 1;
  return `${weekday} ${d}/${m}`;
}

// Lista real de "Mis pacientes" — antes era un placeholder. Se deriva de
// quién ya agendó al menos una cita con este terapeuta (tabla appointments,
// sin importar el estado: hasta un cancelado ya tuvo contacto), no hay un
// flujo aparte de "agregar paciente". Cada tarjeta enlaza a la ficha
// completa en /dashboard/pacientes/[id], que ya existía (historial de
// sesiones + notas privadas) — a esta lista solo le faltaba construirse.
export default async function MisPacientesPage() {
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

  const { data: rawAppointments } = await supabase
    .from("appointments")
    .select("patient_id")
    .eq("therapist_id", user.id);

  // (2026-11-22) También cuentan los pacientes importados (therapist_patients,
  // migración 0051): aún no tienen citas. Si la tabla no existe, solo se omite.
  const { data: importedRows } = await supabase
    .from("therapist_patients")
    .select("patient_id")
    .eq("therapist_id", user.id);
  const importedIds = new Set((importedRows ?? []).map((r) => r.patient_id as string));

  const patientIds = Array.from(
    new Set([...(rawAppointments ?? []).map((a) => a.patient_id as string), ...importedIds])
  );
  const infoMap = await getPatientInfoMap(supabase, user.id, patientIds);

  // Estado de activación de los importados (¿ya entraron a su cuenta?), menores
  // de edad e invitaciones ya hechas: todo por tandas de 100 ids.
  const service = createServiceClient();
  const importedList = [...importedIds];
  const activatedIds = new Set<string>();
  const minorIds = new Set<string>();
  const invitedIds = new Set<string>();
  for (let i = 0; i < importedList.length; i += 100) {
    const ids = importedList.slice(i, i + 100);
    const [claims, pats, invs] = await Promise.all([
      service.from("profiles").select("id, imported_claimed_at").in("id", ids),
      service.from("patients").select("id, birth_date, guardian_name").in("id", ids),
      supabase.from("patient_invitations").select("patient_id").eq("therapist_id", user.id).in("patient_id", ids),
    ]);
    for (const c of claims.data ?? []) if (c.imported_claimed_at) activatedIds.add(c.id as string);
    for (const p of pats.data ?? []) {
      const minor = p.birth_date
        ? isMinorRow({ birthDate: p.birth_date as string, age: null })
        : Boolean(p.guardian_name);
      if (minor) minorIds.add(p.id as string);
    }
    for (const v of invs.data ?? []) invitedIds.add(v.patient_id as string);
  }

  // Nombre a mostrar: las cuentas cerradas llevan "(eliminado)" y van al final.
  const patients = patientIds
    .map((id) => {
      const info = infoMap.get(id)!;
      const base = info.fullName ?? "Paciente";
      const closed = info.accountClosed;
      return {
        id,
        info,
        closed,
        displayName: closed && base !== "Usuario eliminado" ? `${base} (eliminado)` : base,
      };
    })
    .sort((a, b) => {
      if (a.closed !== b.closed) return a.closed ? 1 : -1;
      const byDate = (b.info.lastAppointmentIso ?? "").localeCompare(a.info.lastAppointmentIso ?? "");
      return byDate !== 0 ? byDate : a.displayName.localeCompare(b.displayName, "es");
    });

  // Pacientes que el terapeuta quitó de su lista (si la tabla aún no existe, ninguno).
  const { data: hiddenRows } = await supabase
    .from("therapist_hidden_patients")
    .select("patient_id")
    .eq("therapist_id", user.id);
  const hiddenIds = new Set((hiddenRows ?? []).map((r) => r.patient_id as string));

  const listItems: PatientListItem[] = patients.map((p) => ({
    hidden: hiddenIds.has(p.id),
    id: p.id,
    fullName: p.displayName,
    email: p.info.email,
    phone: p.info.phone,
    notes: p.info.notes,
    lastAppointmentLabel: p.info.lastAppointmentIso ? formatOaxaca(p.info.lastAppointmentIso) : null,
    imported: importedIds.has(p.id),
    activated: activatedIds.has(p.id),
    closed: p.closed,
  }));

  const inviteCandidates: InviteCandidate[] = patients
    .filter(
      (p) =>
        importedIds.has(p.id) &&
        !activatedIds.has(p.id) &&
        !p.closed &&
        !hiddenIds.has(p.id) &&
        !minorIds.has(p.id) &&
        !invitedIds.has(p.id) &&
        Boolean(p.info.email)
    )
    .map((p) => ({ id: p.id, name: p.displayName, email: p.info.email as string }));

  return (
    <>
      <SiteHeader />

      <main className="px-6 py-16 sm:px-8 md:py-20">
        <div className="mx-auto max-w-[820px]">
          <p className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-rose-deep">
            Mis pacientes
          </p>
          <h1 className="mt-2.5 font-display text-[1.9rem] font-medium text-forest sm:text-[2.3rem]">
            {patients.length > 0
              ? `${listItems.filter((i) => !i.hidden).length} paciente${
                  listItems.filter((i) => !i.hidden).length === 1 ? "" : "s"
                }`
              : "Aún no tienes pacientes"}
          </h1>

          <div className="mt-4">
            <Link
              href="/dashboard/pacientes/importar"
              className="inline-block rounded-full border border-forest/30 px-4 py-1.5 text-[0.85rem] font-medium text-forest hover:bg-forest/[0.06]"
            >
              Importar pacientes de otra agenda
            </Link>
          </div>

          {patients.length === 0 ? (
            <p className="mt-3.5 max-w-[440px] text-[0.95rem] text-[#3E4B44]">
              En cuanto alguien agende una consulta contigo, va a aparecer aquí con su ficha e
              historial de sesiones. También puedes traer a tus pacientes de otra agenda.
            </p>
          ) : (
            <PatientsList
              patients={listItems}
              inviteCandidates={inviteCandidates}
              alreadyInvited={invitedIds.size}
            />
          )}
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
