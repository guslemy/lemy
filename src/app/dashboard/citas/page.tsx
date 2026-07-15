import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { confirmAppointment } from "./actions";

// Vista del terapeuta: solicitudes pendientes de confirmar (Etapa D) y sus
// próximas sesiones ya confirmadas con el enlace de Google Meet.

type AppointmentRow = {
  id: string;
  patient_id: string;
  scheduled_at: string;
  duration_min: number;
  status: string;
  meeting_link: string | null;
};

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

export default async function CitasPage({
  searchParams,
}: {
  searchParams: Promise<{ confirmado?: string; error?: string; sin_calendario?: string }>;
}) {
  const { confirmado, error, sin_calendario } = await searchParams;
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
    .select("id, patient_id, scheduled_at, duration_min, status, meeting_link")
    .eq("therapist_id", user.id)
    .neq("status", "cancelled")
    .order("scheduled_at");

  const appointments = (rawAppointments ?? []) as AppointmentRow[];
  const patientIds = Array.from(new Set(appointments.map((a) => a.patient_id)));

  const { data: rawProfiles } = patientIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", patientIds)
    : { data: [] };

  const nameById = new Map((rawProfiles ?? []).map((p) => [p.id, p.full_name as string | null]));

  const pending = appointments.filter((a) => a.status === "pending_payment");
  const confirmedList = appointments.filter((a) => a.status === "confirmed");

  return (
    <>
      <SiteHeader />

      <main className="px-6 py-16 sm:px-8 md:py-20">
        <div className="mx-auto max-w-[720px]">
          <p className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-rose-deep">
            Tus citas
          </p>
          <h1 className="mt-2.5 font-display text-[1.9rem] font-medium text-forest sm:text-[2.3rem]">
            Solicitudes y sesiones
          </h1>

          {confirmado === "1" && (
            <p className="mt-4 rounded-2xl border border-line bg-forest/[0.06] px-5 py-3 text-[0.9rem] text-forest">
              Cita confirmada. Se creó el evento en tu Google Calendar y se invitó al paciente.
            </p>
          )}
          {sin_calendario === "1" && (
            <p className="mt-4 rounded-2xl border border-rose-deep/40 bg-rose/10 px-5 py-3 text-[0.9rem] text-rose-deep">
              Tu cuenta no tiene Google Calendar conectado. Cierra sesión y vuelve a entrar con
              &quot;Continuar con Google&quot; para conectarlo, luego regresa a confirmar.
            </p>
          )}
          {error === "google" && (
            <p className="mt-4 rounded-2xl border border-rose-deep/40 bg-rose/10 px-5 py-3 text-[0.9rem] text-rose-deep">
              Google Calendar rechazó la solicitud. Intenta de nuevo en un momento; si persiste,
              puede que necesites reconectar tu cuenta de Google.
            </p>
          )}
          {error === "1" && (
            <p className="mt-4 rounded-2xl border border-rose-deep/40 bg-rose/10 px-5 py-3 text-[0.9rem] text-rose-deep">
              Algo no salió bien, intenta de nuevo.
            </p>
          )}

          <section className="mt-9">
            <h2 className="mb-3 font-mono text-[0.75rem] uppercase tracking-[0.08em] text-rose-deep">
              Pendientes de confirmar
            </h2>
            {pending.length === 0 ? (
              <p className="text-[0.9rem] text-[#8B978F]">No tienes solicitudes pendientes.</p>
            ) : (
              <div className="space-y-3">
                {pending.map((a) => (
                  <div
                    key={a.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-card p-5"
                  >
                    <div>
                      <p className="font-medium text-forest">
                        {nameById.get(a.patient_id) ?? "Paciente"}
                      </p>
                      <p className="text-[0.85rem] text-[#5A665F]">{formatOaxaca(a.scheduled_at)}</p>
                    </div>
                    <form action={confirmAppointment}>
                      <input type="hidden" name="appointment_id" value={a.id} />
                      <Button type="submit" variant="primary">
                        Confirmar y crear evento
                      </Button>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="mt-9">
            <h2 className="mb-3 font-mono text-[0.75rem] uppercase tracking-[0.08em] text-rose-deep">
              Confirmadas
            </h2>
            {confirmedList.length === 0 ? (
              <p className="text-[0.9rem] text-[#8B978F]">Aún no tienes sesiones confirmadas.</p>
            ) : (
              <div className="space-y-3">
                {confirmedList.map((a) => (
                  <div key={a.id} className="rounded-2xl border border-line bg-card p-5">
                    <p className="font-medium text-forest">{nameById.get(a.patient_id) ?? "Paciente"}</p>
                    <p className="text-[0.85rem] text-[#5A665F]">{formatOaxaca(a.scheduled_at)}</p>
                    {a.meeting_link && (
                      <a
                        href={a.meeting_link}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1.5 inline-block font-mono text-[0.8rem] text-forest underline"
                      >
                        Enlace de Google Meet
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
