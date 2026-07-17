import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SubmitButton } from "@/components/ui/submit-button";
import { BackToDashboard } from "@/components/back-to-dashboard";
import { confirmAppointment, cancelAppointmentTherapist } from "./actions";

// Vista del terapeuta: solicitudes pendientes de confirmar (Etapa D), sus
// próximas sesiones ya confirmadas con el enlace de Google Meet, y su propia
// tasa de cancelación (para que se autoevalúe — feedback explícito del
// dueño del producto, no algo que se le muestra al paciente).

type AppointmentRow = {
  id: string;
  patient_id: string;
  scheduled_at: string;
  duration_min: number;
  status: string;
  meeting_link: string | null;
  cancelled_by: string | null;
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

function CancelForm({ appointmentId }: { appointmentId: string }) {
  return (
    <form action={cancelAppointmentTherapist} className="flex items-center gap-2">
      <input type="hidden" name="appointment_id" value={appointmentId} />
      <input
        type="text"
        name="reason"
        placeholder="Motivo (opcional)"
        className="input-lemy w-[140px] py-1.5 text-[0.8rem]"
      />
      <button
        type="submit"
        className="rounded-full border border-line px-3.5 py-1.5 font-mono text-[0.78rem] text-[#8B978F] hover:border-rose-deep hover:text-rose-deep"
      >
        Cancelar
      </button>
    </form>
  );
}

export default async function CitasPage({
  searchParams,
}: {
  searchParams: Promise<{
    confirmado?: string;
    cancelado?: string;
    error?: string;
    sin_calendario?: string;
  }>;
}) {
  const { confirmado, cancelado, error, sin_calendario } = await searchParams;
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

  // Traemos todo (incluidas canceladas) para poder calcular la tasa de
  // cancelación — el filtrado por sección pasa a hacerse en memoria.
  const { data: rawAppointments } = await supabase
    .from("appointments")
    .select("id, patient_id, scheduled_at, duration_min, status, meeting_link, cancelled_by")
    .eq("therapist_id", user.id)
    .order("scheduled_at");

  const appointments = (rawAppointments ?? []) as AppointmentRow[];
  const patientIds = Array.from(new Set(appointments.map((a) => a.patient_id)));

  const { data: rawProfiles } = patientIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", patientIds)
    : { data: [] };

  const nameById = new Map((rawProfiles ?? []).map((p) => [p.id, p.full_name as string | null]));

  const pending = appointments.filter((a) => a.status === "pending_payment");
  const confirmedList = appointments.filter((a) => a.status === "confirmed");
  const cancelledList = appointments.filter((a) => a.status === "cancelled");
  const cancelledByPatient = cancelledList.filter((a) => a.cancelled_by === "patient").length;
  const cancelledByTherapist = cancelledList.filter((a) => a.cancelled_by === "therapist").length;
  const cancellationRate =
    appointments.length > 0 ? Math.round((cancelledList.length / appointments.length) * 100) : 0;

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
          {cancelado === "1" && (
            <p className="mt-4 rounded-2xl border border-line bg-forest/[0.06] px-5 py-3 text-[0.9rem] text-forest">
              Cita cancelada.
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

          {appointments.length > 0 && (
            <div className="mt-6 rounded-2xl border border-line bg-sage-white p-5">
              <p className="font-mono text-[0.72rem] uppercase tracking-[0.08em] text-rose-deep">
                Tu tasa de cancelación
              </p>
              <p className="mt-1.5 text-[0.9rem] text-[#3E4B44]">
                {cancellationRate}% de tus citas totales se cancelaron
                {cancelledList.length > 0 &&
                  ` (${cancelledByTherapist} por ti, ${cancelledByPatient} por el paciente)`}
                .
              </p>
            </div>
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
                    <div className="flex flex-wrap items-center gap-2.5">
                      <form action={confirmAppointment}>
                        <input type="hidden" name="appointment_id" value={a.id} />
                        <SubmitButton pendingText="Confirmando…">Confirmar y crear evento</SubmitButton>
                      </form>
                      <CancelForm appointmentId={a.id} />
                    </div>
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
                  <div
                    key={a.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-card p-5"
                  >
                    <div>
                      <p className="font-medium text-forest">
                        {nameById.get(a.patient_id) ?? "Paciente"}
                      </p>
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
                    <CancelForm appointmentId={a.id} />
                  </div>
                ))}
              </div>
            )}
          </section>

          <BackToDashboard />
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
