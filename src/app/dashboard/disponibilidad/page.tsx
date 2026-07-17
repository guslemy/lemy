import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SubmitButton } from "@/components/ui/submit-button";
import { BackToDashboard } from "@/components/back-to-dashboard";
import { addAvailabilitySlot, deleteAvailabilitySlot } from "./actions";

// El terapeuta define bloques recurrentes semanales (ej. "lunes 9:00-13:00").
// Con esto, más adelante el paciente puede ver horarios reales disponibles
// al reservar (Etapa C).

const DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

type Slot = {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
};

function formatTime(t: string) {
  return t.slice(0, 5);
}

export default async function DisponibilidadPage({
  searchParams,
}: {
  searchParams: Promise<{ guardado?: string; eliminado?: string; error?: string }>;
}) {
  const { guardado, eliminado, error } = await searchParams;
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

  const { data: rawSlots } = await supabase
    .from("availability_slots")
    .select("id, day_of_week, start_time, end_time")
    .eq("therapist_id", user.id)
    .eq("is_recurring", true)
    .order("day_of_week")
    .order("start_time");

  const slots = (rawSlots ?? []) as Slot[];
  const byDay = DAYS.map((label, index) => ({
    label,
    index,
    slots: slots.filter((s) => s.day_of_week === index),
  }));

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

          <BackToDashboard />
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
