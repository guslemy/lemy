import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { BackToDashboard } from "@/components/back-to-dashboard";
import { cancelAppointmentPatient, updatePatientPhone } from "./actions";

// Vista del paciente: sus solicitudes/sesiones agendadas, con opción de
// cancelar. Antes de esto no existía ninguna forma de ver o cancelar una
// cita del lado del paciente.

type AppointmentRow = {
  id: string;
  therapist_id: string;
  scheduled_at: string;
  status: string;
  meeting_link: string | null;
};

type TherapistInfo = { display_name: string; slug: string };

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

const STATUS_LABEL: Record<string, string> = {
  pending_payment: "Esperando confirmación del terapeuta",
  confirmed: "Confirmada",
  completed: "Completada",
  cancelled: "Cancelada",
  no_show: "No asististe",
};

export default async function MisCitasPage({
  searchParams,
}: {
  searchParams: Promise<{ cancelado?: string; error?: string; telefono_guardado?: string }>;
}) {
  const { cancelado, error, telefono_guardado } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("phone")
    .eq("id", user.id)
    .maybeSingle();

  const { data: rawAppointments } = await supabase
    .from("appointments")
    .select("id, therapist_id, scheduled_at, status, meeting_link")
    .eq("patient_id", user.id)
    .neq("status", "cancelled")
    .order("scheduled_at");

  const appointments = (rawAppointments ?? []) as AppointmentRow[];
  const therapistIds = Array.from(new Set(appointments.map((a) => a.therapist_id)));

  const { data: rawTherapists } = therapistIds.length
    ? await supabase.from("therapists").select("id, display_name, slug").in("id", therapistIds)
    : { data: [] };

  const therapistById = new Map(
    (rawTherapists ?? []).map((t) => [t.id, { display_name: t.display_name, slug: t.slug } as TherapistInfo])
  );

  return (
    <>
      <SiteHeader />

      <main className="px-6 py-16 sm:px-8 md:py-20">
        <div className="mx-auto max-w-[720px]">
          <p className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-rose-deep">
            Tus citas
          </p>
          <h1 className="mt-2.5 font-display text-[1.9rem] font-medium text-forest sm:text-[2.3rem]">
            Tus sesiones
          </h1>

          {cancelado === "1" && (
            <p className="mt-4 rounded-2xl border border-line bg-forest/[0.06] px-5 py-3 text-[0.9rem] text-forest">
              Cita cancelada.
            </p>
          )}
          {error === "1" && (
            <p className="mt-4 rounded-2xl border border-rose-deep/40 bg-rose/10 px-5 py-3 text-[0.9rem] text-rose-deep">
              Algo no salió bien, intenta de nuevo.
            </p>
          )}
          {telefono_guardado === "1" && (
            <p className="mt-4 rounded-2xl border border-line bg-forest/[0.06] px-5 py-3 text-[0.9rem] text-forest">
              Listo, guardamos tu WhatsApp.
            </p>
          )}

          <form
            action={updatePatientPhone}
            className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-card p-5"
          >
            <label className="block">
              <span className="mb-1.5 block text-[0.85rem] font-medium text-forest">
                Tu WhatsApp (para recordatorios de tus citas)
              </span>
              <input
                type="tel"
                name="phone"
                defaultValue={myProfile?.phone ?? ""}
                placeholder="9511234567"
                className="input-lemy w-[220px]"
              />
            </label>
            <button
              type="submit"
              className="rounded-full border border-line px-4 py-2 font-mono text-[0.8rem] text-forest hover:border-forest"
            >
              Guardar
            </button>
          </form>

          {appointments.length === 0 ? (
            <p className="mt-8 text-[0.95rem] text-[#3E4B44]">
              Todavía no tienes sesiones agendadas.{" "}
              <Link href="/buscar" className="text-forest underline">
                Busca un terapeuta
              </Link>
              .
            </p>
          ) : (
            <div className="mt-8 space-y-3">
              {appointments.map((a) => {
                const therapist = therapistById.get(a.therapist_id);
                return (
                  <div
                    key={a.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-card p-5"
                  >
                    <div>
                      {therapist ? (
                        <Link
                          href={`/terapeuta/${therapist.slug}`}
                          className="font-medium text-forest hover:text-rose-deep"
                        >
                          {therapist.display_name}
                        </Link>
                      ) : (
                        <p className="font-medium text-forest">Terapeuta</p>
                      )}
                      <p className="text-[0.85rem] text-[#5A665F]">{formatOaxaca(a.scheduled_at)}</p>
                      <p className="mt-1 font-mono text-[0.72rem] uppercase tracking-[0.06em] text-[#8B978F]">
                        {STATUS_LABEL[a.status] ?? a.status}
                      </p>
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
                    <form action={cancelAppointmentPatient} className="flex items-center gap-2">
                      <input type="hidden" name="appointment_id" value={a.id} />
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
                  </div>
                );
              })}
            </div>
          )}

          <BackToDashboard />
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
