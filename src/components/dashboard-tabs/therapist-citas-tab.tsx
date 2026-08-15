import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SubmitButton } from "@/components/ui/submit-button";
import { getPatientInfoMap } from "@/lib/patient-info";
import { PatientInfoPopup, RescheduleForm, CancelForm } from "@/app/dashboard/citas/citas-client";
import {
  confirmAppointment,
  cancelAppointmentTherapist,
  savePatientNotes,
  rescheduleAppointment,
} from "@/app/dashboard/citas/actions";

// Vista del terapeuta: solicitudes pendientes de confirmar (Etapa D), sus
// próximas sesiones ya confirmadas con el enlace de la videollamada, y su propia
// tasa de cancelación (para que se autoevalúe — feedback explícito del
// dueño del producto, no algo que se le muestra al paciente).

type AppointmentRow = {
  id: string;
  patient_id: string;
  scheduled_at: string;
  duration_min: number;
  status: string;
  payment_status: string | null;
  modality: string | null;
  meeting_link: string | null;
  location_address: string | null;
  cancelled_by: string | null;
  therapist_service: { service: { nombre: string } | null } | null;
};

function ModalityTag({ modality }: { modality: string | null }) {
  if (!modality) return null;
  return (
    <span className="ml-2 rounded-full bg-forest/[0.08] px-2.5 py-0.5 font-mono text-[0.68rem] uppercase tracking-[0.05em] text-forest">
      {modality === "online" ? "En línea" : "Presencial"}
    </span>
  );
}

// Solo aparece si la cita se agendó eligiendo un servicio del catálogo
// (migración 0031) — las citas del flujo viejo (sin catálogo configurado)
// no traen esto y no muestran nada, sin que se vea raro.
function ServiceTag({ name }: { name: string | null }) {
  if (!name) return null;
  return (
    <span className="ml-2 rounded-full bg-rose/15 px-2.5 py-0.5 font-mono text-[0.68rem] text-rose-deep">
      {name}
    </span>
  );
}

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

export type CitasTabParams = {
  citas_confirmado?: string;
  citas_cancelado?: string;
  citas_error?: string;
  citas_reagendado?: string;
};

export async function TherapistCitasTab({ params }: { params: CitasTabParams }) {
  const {
    citas_confirmado: confirmado,
    citas_cancelado: cancelado,
    citas_error: error,
    citas_reagendado: reagendado,
  } = params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Traemos todo (incluidas canceladas) para poder calcular la tasa de
  // cancelación — el filtrado por sección pasa a hacerse en memoria.
  const { data: rawAppointments } = await supabase
    .from("appointments")
    .select(
      "id, patient_id, scheduled_at, duration_min, status, payment_status, modality, meeting_link, location_address, cancelled_by, therapist_service:therapist_services ( service:service_catalog ( nombre ) )"
    )
    .eq("therapist_id", user.id)
    .order("scheduled_at");

  // "as unknown as" a propósito — ver el mismo comentario en
  // patient-mis-citas-tab.tsx: el tipo inferido del query builder para
  // therapist_service -> service llega como arreglo aunque en tiempo de
  // ejecución PostgREST regresa un solo objeto.
  const appointments = (rawAppointments ?? []) as unknown as AppointmentRow[];
  const patientIds = Array.from(new Set(appointments.map((a) => a.patient_id)));

  const { data: rawProfiles } = patientIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", patientIds)
    : { data: [] };

  const nameById = new Map((rawProfiles ?? []).map((p) => [p.id, p.full_name as string | null]));
  const patientInfoById = await getPatientInfoMap(supabase, user.id, patientIds);

  // Se muestran como "por confirmar" las que ya llegaron a pagarse por
  // tarjeta, o las que son en efectivo (nunca pasan por Stripe Checkout, así
  // que no hay nada que esperar). Lo que NO se muestra es una reserva con
  // pago por tarjeta que se quedó a medias (el paciente cerró la pestaña, la
  // tarjeta falló, etc.) — esa no debe generar ninguna expectativa de que
  // hay que confirmar algo.
  const pending = appointments.filter(
    (a) => a.status === "pending_payment" && (a.payment_status === "paid" || a.payment_status === "efectivo")
  );
  const confirmedList = appointments.filter((a) => a.status === "confirmed");
  const cancelledList = appointments.filter((a) => a.status === "cancelled");
  const cancelledByPatient = cancelledList.filter((a) => a.cancelled_by === "patient").length;
  const cancelledByTherapist = cancelledList.filter((a) => a.cancelled_by === "therapist").length;
  const cancellationRate =
    appointments.length > 0 ? Math.round((cancelledList.length / appointments.length) * 100) : 0;

  return (
    <div>
      {confirmado === "1" && (
        <p className="mt-4 rounded-2xl border border-line bg-forest/[0.06] px-5 py-3 text-[0.9rem] text-forest">
          Cita confirmada. Le mandamos a tu paciente el link de la sesión y una invitación de
          calendario por correo.
        </p>
      )}
      {cancelado === "1" && (
        <p className="mt-4 rounded-2xl border border-line bg-forest/[0.06] px-5 py-3 text-[0.9rem] text-forest">
          Cita cancelada.
        </p>
      )}
      {reagendado === "1" && (
        <p className="mt-4 rounded-2xl border border-line bg-forest/[0.06] px-5 py-3 text-[0.9rem] text-forest">
          Cita reagendada. Le avisamos a tu paciente del nuevo horario.
        </p>
      )}
      {error === "1" && (
        <p className="mt-4 rounded-2xl border border-rose-deep/40 bg-rose/10 px-5 py-3 text-[0.9rem] text-rose-deep">
          Algo no salió bien, intenta de nuevo.
        </p>
      )}

      {appointments.length > 0 && (
        <div className="mt-2 rounded-2xl border border-line bg-sage-white p-5">
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
                    <PatientInfoPopup
                      patientId={a.patient_id}
                      name={nameById.get(a.patient_id) ?? "Paciente"}
                      info={
                        patientInfoById.get(a.patient_id) ?? {
                          email: null,
                          phone: null,
                          lastAppointmentIso: null,
                          notes: null,
                        }
                      }
                      saveNotesAction={savePatientNotes}
                    />
                    <ModalityTag modality={a.modality} />
                    <ServiceTag name={a.therapist_service?.service?.nombre ?? null} />
                  </p>
                  <p className="text-[0.85rem] text-[#5A665F]">{formatOaxaca(a.scheduled_at)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <form action={confirmAppointment}>
                    <input type="hidden" name="appointment_id" value={a.id} />
                    <SubmitButton pendingText="Confirmando…">Confirmar y crear evento</SubmitButton>
                  </form>
                  <RescheduleForm appointmentId={a.id} rescheduleAction={rescheduleAppointment} />
                  <CancelForm appointmentId={a.id} cancelAction={cancelAppointmentTherapist} />
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
                    <PatientInfoPopup
                      patientId={a.patient_id}
                      name={nameById.get(a.patient_id) ?? "Paciente"}
                      info={
                        patientInfoById.get(a.patient_id) ?? {
                          email: null,
                          phone: null,
                          lastAppointmentIso: null,
                          notes: null,
                        }
                      }
                      saveNotesAction={savePatientNotes}
                    />
                    <ModalityTag modality={a.modality} />
                    <ServiceTag name={a.therapist_service?.service?.nombre ?? null} />
                  </p>
                  <p className="text-[0.85rem] text-[#5A665F]">{formatOaxaca(a.scheduled_at)}</p>
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
                <div className="flex flex-wrap items-center gap-2.5">
                  <RescheduleForm appointmentId={a.id} rescheduleAction={rescheduleAppointment} />
                  <CancelForm appointmentId={a.id} cancelAction={cancelAppointmentTherapist} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
