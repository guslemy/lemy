import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SubmitButton } from "@/components/ui/submit-button";
import { BackToDashboard } from "@/components/back-to-dashboard";
import { BlockDatesForm } from "@/components/block-dates-form";
import {
  addAvailabilitySlot,
  deleteAvailabilitySlot,
  updateBookingLead,
  updateBookingMax,
  updateSessionSettings,
  addBlockedSlot,
  deleteBlockedSlot,
} from "./actions";

// El terapeuta define bloques recurrentes semanales (ej. "lunes 9:00-13:00").
// Con esto, más adelante el paciente puede ver horarios reales disponibles
// al reservar (Etapa C). También define cuánta anticipación mínima necesita
// y puede bloquear rangos puntuales (vacaciones, una comida familiar, etc.)
// — ambos se aplican en src/lib/availability.ts al calcular horarios reales.

const DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
// "horas" solo aplica a la anticipación MÍNIMA (tiene sentido decir "avísame
// con 2 horas"); para el máximo a futuro no se ofrece, por eso son dos listas.
const LEAD_UNITS = [
  { value: "horas", label: "horas" },
  { value: "dias", label: "días" },
  { value: "semanas", label: "semanas" },
  { value: "meses", label: "meses" },
];
const MAX_WINDOW_UNITS = [
  { value: "dias", label: "días" },
  { value: "semanas", label: "semanas" },
  { value: "meses", label: "meses" },
];
const SESSION_DURATIONS = [30, 45, 50, 60, 75, 90];
const BUFFER_OPTIONS = [
  { value: 0, label: "Sin descanso, citas seguidas" },
  { value: 15, label: "15 minutos" },
  { value: 30, label: "30 minutos" },
  { value: 60, label: "60 minutos" },
];

type Slot = {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
};

type BlockedSlot = {
  id: string;
  start_at: string;
  end_at: string;
  reason: string | null;
};

function formatTime(t: string) {
  return t.slice(0, 5);
}

const WEEKDAY_LABELS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const OAXACA_UTC_OFFSET_MIN = 6 * 60;

function formatOaxacaRange(startIso: string, endIso: string) {
  const startLocal = new Date(new Date(startIso).getTime() - OAXACA_UTC_OFFSET_MIN * 60 * 1000);
  const endLocal = new Date(new Date(endIso).getTime() - OAXACA_UTC_OFFSET_MIN * 60 * 1000);
  const weekday = WEEKDAY_LABELS[startLocal.getUTCDay()];
  const d = startLocal.getUTCDate();
  const m = startLocal.getUTCMonth() + 1;
  const startHH = String(startLocal.getUTCHours()).padStart(2, "0");
  const startMM = String(startLocal.getUTCMinutes()).padStart(2, "0");
  const endHH = String(endLocal.getUTCHours()).padStart(2, "0");
  const endMM = String(endLocal.getUTCMinutes()).padStart(2, "0");
  return `${weekday} ${d}/${m} · ${startHH}:${startMM}–${endHH}:${endMM}`;
}

export default async function DisponibilidadPage({
  searchParams,
}: {
  searchParams: Promise<{
    guardado?: string;
    eliminado?: string;
    error?: string;
    guardado_anticipacion?: string;
    guardado_duracion?: string;
    guardado_ventana_maxima?: string;
    bloqueado?: string;
    desbloqueado?: string;
  }>;
}) {
  const {
    guardado,
    eliminado,
    error,
    guardado_anticipacion,
    guardado_duracion,
    guardado_ventana_maxima,
    bloqueado,
    desbloqueado,
  } = await searchParams;
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

  const [{ data: rawSlots }, { data: therapist }, { data: rawBlocked }] = await Promise.all([
    supabase
      .from("availability_slots")
      .select("id, day_of_week, start_time, end_time")
      .eq("therapist_id", user.id)
      .eq("is_recurring", true)
      .order("day_of_week")
      .order("start_time"),
    supabase
      .from("therapists")
      .select(
        "booking_lead_amount, booking_lead_unit, booking_max_amount, booking_max_unit, session_duration_min, buffer_min"
      )
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("therapist_blocked_slots")
      .select("id, start_at, end_at, reason")
      .eq("therapist_id", user.id)
      .order("start_at"),
  ]);

  const slots = (rawSlots ?? []) as Slot[];
  const byDay = DAYS.map((label, index) => ({
    label,
    index,
    slots: slots.filter((s) => s.day_of_week === index),
  }));

  const blockedSlots = (rawBlocked ?? []) as BlockedSlot[];

  return (
    <>
      <SiteHeader />

      <main className="px-6 py-16 sm:px-8 md:py-20">
        <div className="mx-auto max-w-[720px]">
          <p className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-rose-deep">
            Tu disponibilidad
          </p>
          <h1 className="mt-2.5 font-display text-[1.9rem] font-medium text-forest sm:text-[2.3rem]">
            ¿Cuándo atiendes?
          </h1>
          <p className="mt-3 text-[0.95rem] text-[#3E4B44]">
            Define tus bloques semanales. Los pacientes solo van a poder reservar dentro de estos
            horarios.
          </p>

          {guardado === "1" && (
            <p className="mt-4 rounded-2xl border border-line bg-forest/[0.06] px-5 py-3 text-[0.9rem] text-forest">
              Horario agregado.
            </p>
          )}
          {eliminado === "1" && (
            <p className="mt-4 rounded-2xl border border-line bg-forest/[0.06] px-5 py-3 text-[0.9rem] text-forest">
              Horario eliminado.
            </p>
          )}
          {error === "1" && (
            <p className="mt-4 rounded-2xl border border-rose-deep/40 bg-rose/10 px-5 py-3 text-[0.9rem] text-rose-deep">
              Revisa el día y que la hora de inicio sea antes que la de fin.
            </p>
          )}
          {guardado_anticipacion === "1" && (
            <p className="mt-4 rounded-2xl border border-line bg-forest/[0.06] px-5 py-3 text-[0.9rem] text-forest">
              Listo, actualizamos tu anticipación mínima.
            </p>
          )}
          {error === "anticipacion" && (
            <p className="mt-4 rounded-2xl border border-rose-deep/40 bg-rose/10 px-5 py-3 text-[0.9rem] text-rose-deep">
              El número debe ser entre 0 y 30, y no puede pasar de 1 año en total.
            </p>
          )}
          {guardado_duracion === "1" && (
            <p className="mt-4 rounded-2xl border border-line bg-forest/[0.06] px-5 py-3 text-[0.9rem] text-forest">
              Listo, actualizamos la duración de tus consultas.
            </p>
          )}
          {error === "duracion" && (
            <p className="mt-4 rounded-2xl border border-rose-deep/40 bg-rose/10 px-5 py-3 text-[0.9rem] text-rose-deep">
              Elige una duración y un descanso válidos de la lista.
            </p>
          )}
          {guardado_ventana_maxima === "1" && (
            <p className="mt-4 rounded-2xl border border-line bg-forest/[0.06] px-5 py-3 text-[0.9rem] text-forest">
              Listo, actualizamos hasta cuándo a futuro te pueden reservar.
            </p>
          )}
          {error === "ventana_maxima" && (
            <p className="mt-4 rounded-2xl border border-rose-deep/40 bg-rose/10 px-5 py-3 text-[0.9rem] text-rose-deep">
              El número debe ser entre 1 y 90, y no puede pasar de 1 año en total.
            </p>
          )}
          {bloqueado === "1" && (
            <p className="mt-4 rounded-2xl border border-line bg-forest/[0.06] px-5 py-3 text-[0.9rem] text-forest">
              Fechas bloqueadas.
            </p>
          )}
          {desbloqueado === "1" && (
            <p className="mt-4 rounded-2xl border border-line bg-forest/[0.06] px-5 py-3 text-[0.9rem] text-forest">
              Bloqueo eliminado.
            </p>
          )}
          {error === "bloqueo" && (
            <p className="mt-4 rounded-2xl border border-rose-deep/40 bg-rose/10 px-5 py-3 text-[0.9rem] text-rose-deep">
              Revisa que la fecha de inicio sea antes que la de fin.
            </p>
          )}

          <form
            action={addAvailabilitySlot}
            className="signature-corner mt-8 grid grid-cols-1 gap-4 rounded-[28px] border border-line bg-card p-7 sm:grid-cols-[1.2fr_1fr_1fr_auto] sm:items-end"
          >
            <label className="block">
              <span className="mb-1.5 block text-[0.85rem] font-medium text-forest">Día</span>
              <select name="day_of_week" defaultValue="1" className="input-lemy">
                {DAYS.map((label, index) => (
                  <option key={label} value={index}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[0.85rem] font-medium text-forest">Desde</span>
              <input type="time" name="start_time" defaultValue="09:00" required className="input-lemy" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[0.85rem] font-medium text-forest">Hasta</span>
              <input type="time" name="end_time" defaultValue="14:00" required className="input-lemy" />
            </label>
            <SubmitButton pendingText="Agregando…">Agregar</SubmitButton>
          </form>

          <div className="mt-9 space-y-4">
            {byDay.map((day) => (
              <div key={day.index} className="rounded-2xl border border-line bg-card p-5">
                <p className="mb-2.5 font-mono text-[0.75rem] uppercase tracking-[0.08em] text-rose-deep">
                  {day.label}
                </p>
                {day.slots.length === 0 ? (
                  <p className="text-[0.85rem] text-[#8B978F]">Sin horario definido.</p>
                ) : (
                  <div className="flex flex-wrap gap-2.5">
                    {day.slots.map((s) => (
                      <form key={s.id} action={deleteAvailabilitySlot} className="inline-flex">
                        <input type="hidden" name="id" value={s.id} />
                        <button
                          type="submit"
                          className="flex items-center gap-2 rounded-full border border-line bg-sage-white px-4 py-1.5 font-mono text-[0.8rem] text-forest hover:border-rose-deep hover:text-rose-deep"
                          title="Quitar este horario"
                        >
                          {formatTime(s.start_time)}–{formatTime(s.end_time)}
                          <span aria-hidden="true">✕</span>
                        </button>
                      </form>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <section className="mt-12">
            <h2 className="font-display text-[1.3rem] text-forest">¿Cuánto tiempo dura tu consulta?</h2>
            <p className="mt-1.5 text-[0.9rem] text-[#3E4B44]">
              Esto define cómo partimos tus bloques semanales en horarios reservables.
            </p>
            <form
              action={updateSessionSettings}
              className="signature-corner mt-5 grid grid-cols-1 gap-4 rounded-[28px] border border-line bg-card p-7 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
            >
              <label className="block">
                <span className="mb-1.5 block text-[0.85rem] font-medium text-forest">Duración de la consulta</span>
                <select
                  name="session_duration_min"
                  defaultValue={therapist?.session_duration_min ?? 50}
                  className="input-lemy"
                >
                  {SESSION_DURATIONS.map((min) => (
                    <option key={min} value={min}>
                      {min} minutos
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[0.85rem] font-medium text-forest">
                  Descanso entre citas
                </span>
                <select
                  name="buffer_min"
                  defaultValue={therapist?.buffer_min ?? 0}
                  className="input-lemy"
                >
                  {BUFFER_OPTIONS.map((b) => (
                    <option key={b.value} value={b.value}>
                      {b.label}
                    </option>
                  ))}
                </select>
              </label>
              <SubmitButton pendingText="Guardando…">Guardar</SubmitButton>
            </form>
          </section>

          <section className="mt-12">
            <h2 className="font-display text-[1.3rem] text-forest">¿Con cuánta anticipación te pueden agendar?</h2>
            <p className="mt-1.5 text-[0.9rem] text-[#3E4B44]">
              Controla tanto qué tan pronto como qué tan lejos a futuro puede reservar un paciente.
              Usa 0 si te parece bien que te agenden en el momento.
            </p>
            <form
              action={updateBookingLead}
              className="signature-corner mt-5 grid grid-cols-1 gap-4 rounded-[28px] border border-line bg-card p-7 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
            >
              <label className="block">
                <span className="mb-1.5 block text-[0.85rem] font-medium text-forest">Mínimo</span>
                <input
                  type="number"
                  name="booking_lead_amount"
                  min={0}
                  max={30}
                  defaultValue={therapist?.booking_lead_amount ?? 1}
                  required
                  className="input-lemy"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[0.85rem] font-medium text-forest">Unidad</span>
                <select
                  name="booking_lead_unit"
                  defaultValue={therapist?.booking_lead_unit ?? "dias"}
                  className="input-lemy"
                >
                  {LEAD_UNITS.map((u) => (
                    <option key={u.value} value={u.value}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </label>
              <SubmitButton pendingText="Guardando…">Guardar</SubmitButton>
            </form>

            <form
              action={updateBookingMax}
              className="signature-corner mt-4 grid grid-cols-1 gap-4 rounded-[28px] border border-line bg-card p-7 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
            >
              <label className="block">
                <span className="mb-1.5 block text-[0.85rem] font-medium text-forest">Máximo a futuro</span>
                <input
                  type="number"
                  name="booking_max_amount"
                  min={1}
                  max={90}
                  defaultValue={therapist?.booking_max_amount ?? 3}
                  required
                  className="input-lemy"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[0.85rem] font-medium text-forest">Unidad</span>
                <select
                  name="booking_max_unit"
                  defaultValue={therapist?.booking_max_unit ?? "meses"}
                  className="input-lemy"
                >
                  {MAX_WINDOW_UNITS.map((u) => (
                    <option key={u.value} value={u.value}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </label>
              <SubmitButton pendingText="Guardando…">Guardar</SubmitButton>
            </form>
          </section>

          <section className="mt-12">
            <h2 className="font-display text-[1.3rem] text-forest">Bloquear fechas</h2>
            <p className="mt-1.5 text-[0.9rem] text-[#3E4B44]">
              Para lo puntual: una comida, un viaje, un día que quieres descansar. No afecta tus
              bloques semanales, solo quita ese rango mientras dure.
            </p>
            <BlockDatesForm action={addBlockedSlot} />

            {blockedSlots.length > 0 && (
              <div className="mt-5 space-y-2.5">
                {blockedSlots.map((b) => (
                  <div
                    key={b.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-card px-5 py-3.5"
                  >
                    <div>
                      <p className="text-[0.88rem] font-medium text-forest">
                        {formatOaxacaRange(b.start_at, b.end_at)}
                      </p>
                      {b.reason && <p className="text-[0.8rem] text-[#5A665F]">{b.reason}</p>}
                    </div>
                    <form action={deleteBlockedSlot}>
                      <input type="hidden" name="id" value={b.id} />
                      <button
                        type="submit"
                        className="font-mono text-[0.78rem] text-[#8B978F] hover:text-rose-deep"
                      >
                        Quitar ✕
                      </button>
                    </form>
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
