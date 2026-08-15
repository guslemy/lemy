import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { cancelAppointmentPatient, updatePatientPhone } from "@/app/dashboard/mis-citas/actions";

// Vista del paciente: sus solicitudes/sesiones agendadas, con opción de
// cancelar. Hoy es la única pestaña del panel de paciente — se estructura
// igual que el panel de terapeuta (PanelTabs) para que agregar más
// secciones más adelante no requiera rediseñar nada, aunque con 1 sola
// pestaña la barra de pills no se muestra (ver panel-tabs.tsx).

type AppointmentRow = {
  id: string;
  therapist_id: string;
  scheduled_at: string;
  status: string;
  payment_status: string | null;
  modality: string | null;
  meeting_link: string | null;
  location_address: string | null;
  therapist_service: { service: { nombre: string } | null } | null;
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

export type MisCitasTabParams = {
  cancelado?: string;
  error?: string;
  telefono_guardado?: string;
};

export async function PatientMisCitasTab({ params }: { params: MisCitasTabParams }) {
  const { cancelado, error, telefono_guardado } = params;
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
    .select(
      "id, therapist_id, scheduled_at, status, payment_status, modality, meeting_link, location_address, therapist_service:therapist_services ( service:service_catalog ( nombre ) )"
    )
    .eq("patient_id", user.id)
    .neq("status", "cancelled")
    .order("scheduled_at");

  // "as unknown as" a propósito: sin tipos generados de Supabase, el
  // inferido del query builder para relaciones embebidas (therapist_service
  // -> service) llega demasiado conservador (como arreglo) aunque en tiempo
  // de ejecución PostgREST regresa un solo objeto (es una FK belongs-to, no
  // una relación inversa) — mismo criterio que ya se usa en [slug]/page.tsx.
  const appointments = (rawAppointments ?? []) as unknown as AppointmentRow[];
  const therapistIds = Array.from(new Set(appointments.map((a) => a.therapist_id)));

  const { data: rawTherapists } = therapistIds.length
    ? await supabase.from("therapists").select("id, display_name, slug").in("id", therapistIds)
    : { data: [] };

  const therapistById = new Map(
    (rawTherapists ?? []).map((t) => [t.id, { display_name: t.display_name, slug: t.slug } as TherapistInfo])
  );

  return (
    <div>
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
                      href={`/${therapist.slug}`}
                      className="font-medium text-forest hover:text-rose-deep"
                    >
                      {therapist.display_name}
                    </Link>
                  ) : (
                    <p className="font-medium text-forest">Terapeuta</p>
                  )}
                  <p className="text-[0.85rem] text-[#5A665F]">{formatOaxaca(a.scheduled_at)}</p>
                  <p className="mt-1 font-mono text-[0.72rem] uppercase tracking-[0.06em] text-[#8B978F]">
                    {a.status === "pending_payment" && a.payment_status === "pending"
                      ? "Pago no completado"
                      : (STATUS_LABEL[a.status] ?? a.status)}
                    {a.modality && ` · ${a.modality === "online" ? "En línea" : "Presencial"}`}
                    {a.therapist_service?.service?.nombre && ` · ${a.therapist_service.service.nombre}`}
                  </p>
                  {a.modality === "online" && a.meeting_link && (
                    <a
                      href={a.meeting_link}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1.5 inline-block font-mono text-[0.8rem] text-forest underline"
                    >
                      Entrar a la videollamada
                    </a>
                  )}
                  {a.modality === "presencial" && a.location_address && (
                    <p className="mt-1.5 text-[0.8rem] text-[#3E4B44]">
                      <span className="font-medium">Dirección:</span> {a.location_address}
                    </p>
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
    </div>
  );
}
