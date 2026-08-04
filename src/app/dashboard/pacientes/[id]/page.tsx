import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { BackToDashboard } from "@/components/back-to-dashboard";
import { getPatientInfoMap } from "@/lib/patient-info";
import { savePatientNotes } from "../../citas/actions";

const WEEKDAY_LABELS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const OAXACA_UTC_OFFSET_MIN = 6 * 60;

function formatOaxaca(iso: string) {
  const utcMs = new Date(iso).getTime() - OAXACA_UTC_OFFSET_MIN * 60 * 1000;
  const local = new Date(utcMs);
  const weekday = WEEKDAY_LABELS[local.getUTCDay()];
  const d = local.getUTCDate();
  const m = local.getUTCMonth() + 1;
  const hh = String(local.getUTCHours()).padStart(2, "0");
  const mm = String(local.getUTCMinutes()).padStart(2, "0");
  return `${weekday} ${d}/${m} · ${hh}:${mm}`;
}

// Ficha básica de un paciente, vista solo por el terapeuta que lo atiende
// (por eso exige que exista al menos una cita entre ambos — nadie puede
// entrar a la ficha de un paciente ajeno solo adivinando su id en la URL).
export default async function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: patientId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "therapist") redirect("/dashboard");

  const { data: history } = await supabase
    .from("appointments")
    .select("id, scheduled_at, status, modality")
    .eq("therapist_id", user.id)
    .eq("patient_id", patientId)
    .order("scheduled_at", { ascending: false });

  if (!history || history.length === 0) notFound();

  const infoMap = await getPatientInfoMap(supabase, user.id, [patientId]);
  const info = infoMap.get(patientId);

  return (
    <>
      <SiteHeader />
      <main className="px-6 py-16 sm:px-8 md:py-20">
        <div className="mx-auto max-w-[680px]">
          <p className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-rose-deep">
            Ficha de paciente
          </p>
          <h1 className="mt-2.5 font-display text-[1.9rem] font-medium text-forest sm:text-[2.3rem]">
            {info?.fullName ?? "Paciente"}
          </h1>

          <div className="signature-corner mt-8 rounded-[28px] border border-line bg-card p-7">
            <p className="font-mono text-[0.72rem] uppercase tracking-[0.1em] text-rose-deep">Contacto</p>
            <p className="mt-2 text-[0.92rem] text-[#3E4B44]">{info?.email ?? "—"}</p>
            <p className="text-[0.92rem] text-[#3E4B44]">{info?.phone ?? "—"}</p>

            <form action={savePatientNotes} className="mt-6">
              <input type="hidden" name="patient_id" value={patientId} />
              <label className="mb-1.5 block font-mono text-[0.7rem] uppercase tracking-[0.08em] text-rose-deep">
                Notas privadas
              </label>
              <textarea
                name="notes"
                defaultValue={info?.notes ?? ""}
                rows={4}
                placeholder="Solo tú puedes ver esto…"
                className="input-lemy w-full resize-none"
              />
              <button
                type="submit"
                className="mt-3 rounded-full bg-forest px-5 py-2 text-[0.88rem] font-semibold text-sage-white hover:bg-forest-deep"
              >
                Guardar notas
              </button>
            </form>
          </div>

          <section className="mt-9">
            <h2 className="mb-3 font-mono text-[0.75rem] uppercase tracking-[0.08em] text-rose-deep">
              Historial de sesiones
            </h2>
            <div className="space-y-2.5">
              {history.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between rounded-2xl border border-line bg-card px-5 py-3.5"
                >
                  <p className="text-[0.9rem] text-forest">{formatOaxaca(a.scheduled_at as string)}</p>
                  <span className="font-mono text-[0.72rem] uppercase tracking-[0.05em] text-[#8B978F]">
                    {a.status === "cancelled" ? "Cancelada" : a.status === "confirmed" ? "Confirmada" : "Pendiente"}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <BackToDashboard />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
