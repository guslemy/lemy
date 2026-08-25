import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getPatientInfoMap } from "@/lib/patient-info";

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

function initialsFrom(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
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

  const patientIds = Array.from(new Set((rawAppointments ?? []).map((a) => a.patient_id as string)));
  const infoMap = await getPatientInfoMap(supabase, user.id, patientIds);

  const patients = patientIds
    .map((id) => ({ id, ...infoMap.get(id)! }))
    .sort((a, b) => (b.lastAppointmentIso ?? "").localeCompare(a.lastAppointmentIso ?? ""));

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
              ? `${patients.length} persona${patients.length === 1 ? "" : "s"} han agendado contigo`
              : "Aún no tienes pacientes"}
          </h1>

          {patients.length === 0 ? (
            <p className="mx-auto mt-3.5 max-w-[440px] text-[0.95rem] text-[#3E4B44]">
              En cuanto alguien agende una consulta contigo, va a aparecer aquí con su ficha e
              historial de sesiones.
            </p>
          ) : (
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {patients.map((p, i) => (
                <Link
                  key={p.id}
                  href={`/dashboard/pacientes/${p.id}`}
                  className="signature-corner flex items-center gap-4 rounded-[22px] border border-line bg-card p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-signature)]"
                >
                  <div
                    className="flex h-11 w-11 flex-none items-center justify-center rounded-full font-display text-[0.95rem] font-semibold text-white"
                    style={{
                      background:
                        i % 3 === 0
                          ? "linear-gradient(135deg,#3E6B54,var(--forest))"
                          : i % 3 === 1
                            ? "linear-gradient(135deg,var(--rose),var(--rose-deep))"
                            : "linear-gradient(135deg,#B99433,#8E7124)",
                    }}
                  >
                    {initialsFrom(p.fullName ?? "Paciente")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-forest">{p.fullName ?? "Paciente"}</p>
                    <p className="text-[0.8rem] text-[#7C877F]">
                      {p.lastAppointmentIso
                        ? `Última cita: ${formatOaxaca(p.lastAppointmentIso)}`
                        : "Sin citas confirmadas"}
                    </p>
                  </div>
                  <span className="flex-none text-[0.82rem] font-semibold text-rose-deep">Ver ficha →</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
